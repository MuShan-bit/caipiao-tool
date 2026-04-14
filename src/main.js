import './style.css'

const ISSUE_COUNT = 3
const GRID_COLUMNS = 4
const GRID_ROWS = 4
const CELLS_PER_ISSUE = GRID_COLUMNS * GRID_ROWS
const RESULT_GROUP_COUNT = 10
const HISTORY_STORAGE_KEY = 'lottery_inference_history_v1'
const HISTORY_LIMIT = 30

const app = document.querySelector('#app')

const state = {
  activeView: 'input',
  statusText: '准备就绪：请输入历史开奖数据以供推理',
  issues: Array.from({ length: ISSUE_COUNT }, () => Array(CELLS_PER_ISSUE).fill('')),
  results: getDefaultResults(),
  lastComputedAt: null,
  historyRecords: loadHistoryRecords(),
  historyOpen: false,
  columnModal: null,
}

render()

function render() {
  app.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}

      <main class="main-zone">
        <div class="status-line">
          <span class="inference-pulse" aria-hidden="true"></span>
          <span>${state.statusText}</span>
        </div>

        ${state.activeView === 'input' ? renderInputView() : renderResultView()}
      </main>

      <section class="action-dock">
        <button class="btn btn-primary" id="run-btn" type="button">${
          state.activeView === 'input' ? '开始计算' : '重新计算'
        }</button>
        <p class="dock-note">${
          state.activeView === 'input'
            ? '输入 3 期完整 4x4 数字后，按三数和值个位规则生成 10 组结果。'
            : '第1组对应个位0，第2组对应个位1，依次到第10组个位9。'
        }</p>
      </section>

      <nav class="bottom-nav" aria-label="主导航">
        <button class="tab-btn ${state.activeView === 'input' ? 'is-active' : ''}" type="button" data-view="input">
          <span class="tab-icon">${databaseIcon()}</span>
          <span>输入数据</span>
        </button>
        <button class="tab-btn ${state.activeView === 'result' ? 'is-active' : ''}" type="button" data-view="result">
          <span class="tab-icon">${trendIcon()}</span>
          <span>推理结果</span>
        </button>
      </nav>

      ${renderHistoryPanel()}
      ${renderColumnModal()}
    </div>
  `

  bindEvents()
}

function renderHeader() {
  if (state.activeView === 'result') {
    return `
      <header class="app-header app-header-result">
        <button class="icon-btn" type="button" data-view="input" aria-label="返回输入页">
          ${backIcon()}
        </button>
        <h1 class="header-title">推理结果</h1>
        <button class="icon-btn" type="button" data-action="open-history" aria-label="历史记录">
          ${historyIcon()}
        </button>
      </header>
    `
  }

  return `
    <header class="app-header">
      <div class="brand-wrap">
        <span class="brand-mark" aria-hidden="true">${brandIcon()}</span>
        <h1 class="header-title">彩票号码推理工具</h1>
      </div>
      <div class="header-actions">
        <button class="icon-btn" type="button" data-action="open-history" aria-label="历史记录">
          ${historyIcon()}
        </button>
      </div>
    </header>
  `
}

function renderInputView() {
  return `
    <section class="content-list">
      ${state.issues
        .map(
          (issue, issueIndex) => `
            <article class="issue-card">
              <div class="issue-head">
                <h3 class="issue-title">第${issueIndex + 1}期</h3>
              </div>
              <div class="digit-grid">
                ${issue
                  .map((value, cellIndex) => {
                    const absoluteOrder = issueIndex * CELLS_PER_ISSUE + cellIndex
                    return `
                      <input
                        class="digit-input"
                        type="text"
                        inputmode="numeric"
                        maxlength="1"
                        pattern="[0-9]"
                        placeholder="-"
                        aria-label="第${issueIndex + 1}期 第${cellIndex + 1}格"
                        data-issue-index="${issueIndex}"
                        data-cell-index="${cellIndex}"
                        data-order="${absoluteOrder}"
                        value="${value}"
                      />
                    `
                  })
                  .join('')}
              </div>
            </article>
          `,
        )
        .join('')}
    </section>
  `
}

function renderResultView() {
  return `
    <section class="content-list result-list">
      ${state.results
        .map((group) => {
          return `
            <article class="result-card">
              <div class="result-head">
                <h3 class="result-title">${group.title}</h3>
              </div>
              <div class="subgroup-list">
                ${group.subgroups.map((subgroup) => renderResultSubgroup(group, subgroup)).join('')}
              </div>
            </article>
          `
        })
        .join('')}
    </section>
  `
}

function renderResultSubgroup(group, subgroup) {
  const columnCount = subgroup.columns.length
  return `
    <section class="result-subgroup">
      <h4 class="subgroup-label">${subgroup.label}</h4>
      ${
        columnCount
          ? `
            <div class="result-scroll-wrap">
              <div class="result-rows" style="--col-count: ${columnCount};">
                ${[0, 1, 2]
                  .map((rowIndex) =>
                    renderResultRow(
                      subgroup.columns,
                      rowIndex,
                      rowIndex === 0 ? 'is-primary' : rowIndex === 1 ? 'is-soft' : 'is-neutral',
                      group.title,
                      subgroup.label,
                    ),
                  )
                  .join('')}
              </div>
            </div>
          `
          : '<p class="subgroup-empty">无匹配</p>'
      }
    </section>
  `
}

function renderResultRow(columns, rowIndex, chipClassName, groupTitle, subgroupLabel) {
  const columnCount = columns.length
  const cells = Array.from({ length: columnCount }, (_, index) => {
    const column = columns[index]
    const num = column?.digits?.[rowIndex]
    if (!Number.isInteger(num)) {
      return `<span class="number-chip ${chipClassName} is-empty" aria-hidden="true"></span>`
    }

    return `
      <button
        class="number-chip ${chipClassName}"
        type="button"
        data-column-id="${column.id}"
        title="${groupTitle} ${subgroupLabel} 第${index + 1}列"
      >${formatNumber(num)}</button>
    `
  }).join('')

  return `
    <div class="result-row">
      <div class="chip-list">${cells}</div>
    </div>
  `
}

function renderHistoryPanel() {
  if (!state.historyOpen) {
    return ''
  }

  return `
    <div class="history-overlay" id="history-overlay" aria-hidden="true"></div>
    <aside class="history-drawer" role="dialog" aria-modal="true" aria-label="历史记录">
      <div class="history-head">
        <h2 class="history-title">历史记录</h2>
        <button class="history-close" id="history-close-btn" type="button">关闭</button>
      </div>
      <div class="history-body">
        ${
          state.historyRecords.length
            ? state.historyRecords
                .map((record) => {
                  const computedAt = formatTime(record.createdAt)
                  const filledCount = record.issues.flat().filter((value) => value !== '').length
                  const matchedCount = countMatchedColumns(record.results)

                  return `
                    <article class="history-item">
                      <h3 class="history-item-title">${computedAt}</h3>
                      <p class="history-item-meta">录入 ${filledCount}/${ISSUE_COUNT * CELLS_PER_ISSUE} 位 · 匹配 ${matchedCount} 组</p>
                      <div class="history-item-actions">
                        <button class="history-item-btn" data-history-restore="${record.id}" type="button">恢复</button>
                        <button class="history-item-btn is-danger" data-history-delete="${record.id}" type="button">删除</button>
                      </div>
                    </article>
                  `
                })
                .join('')
            : '<p class="history-empty">暂无历史记录，完成一次计算后会自动保存。</p>'
        }
      </div>
      <div class="history-foot">
        <button class="btn btn-secondary" id="history-clear-btn" type="button" ${
          state.historyRecords.length ? '' : 'disabled'
        }>清空历史</button>
      </div>
    </aside>
  `
}

function renderColumnModal() {
  if (!state.columnModal) {
    return ''
  }

  const { groupTitle, subgroupLabel, columnIndex, picks, digits } = state.columnModal
  return `
    <div class="column-modal-overlay" id="column-modal-overlay" aria-hidden="true"></div>
    <aside class="column-modal" role="dialog" aria-modal="true" aria-label="列坐标详情">
      <div class="column-modal-head">
        <div class="column-modal-head-text">
          <h2 class="column-modal-title">${groupTitle} · ${subgroupLabel} · 第${columnIndex}列</h2>
          <p class="column-modal-note">该列三数和值个位：${digits[1]}，高亮显示对应输入数据的 9 个点位。</p>
        </div>
        <button class="column-modal-close" id="column-modal-close" type="button">关闭</button>
      </div>
      <div class="column-modal-body">
        ${state.issues.map((issue, issueIndex) => renderModalIssueGrid(issue, issueIndex, picks)).join('')}
      </div>
    </aside>
  `
}

function renderModalIssueGrid(issue, issueIndex, picks) {
  return `
    <article class="modal-issue-card">
      <h3 class="modal-issue-title">第${issueIndex + 1}期</h3>
      <div class="modal-issue-grid">
        ${issue
          .map((value, cellIndex) => {
            const row = Math.floor(cellIndex / GRID_COLUMNS)
            const col = cellIndex % GRID_COLUMNS
            const isActive = hasCoord(picks, row, col)
            return `
              <span class="modal-issue-cell ${isActive ? 'is-highlight' : ''}">
                ${value === '' ? '-' : value}
              </span>
            `
          })
          .join('')}
      </div>
    </article>
  `
}

function hasCoord(picks, row, col) {
  return picks.some((coord) => coord.row === row && coord.col === col)
}

function bindEvents() {
  const navButtons = document.querySelectorAll('[data-view]')
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextView = button.getAttribute('data-view')
      if (!nextView) {
        return
      }
      state.activeView = nextView
      state.columnModal = null
      if (nextView === 'input') {
        state.statusText = '准备就绪：请输入历史开奖数据以供推理'
      } else if (nextView === 'result') {
        state.statusText = state.lastComputedAt
          ? `计算已完成：${state.lastComputedAt}`
          : '请先输入数据并开始计算'
      }
      render()
    })
  })

  const openHistoryButtons = document.querySelectorAll('[data-action="open-history"]')
  openHistoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.historyOpen = true
      state.columnModal = null
      render()
    })
  })

  const historyCloseButton = document.querySelector('#history-close-btn')
  historyCloseButton?.addEventListener('click', closeHistoryPanel)

  const historyOverlay = document.querySelector('#history-overlay')
  historyOverlay?.addEventListener('click', closeHistoryPanel)

  const columnModalOverlay = document.querySelector('#column-modal-overlay')
  columnModalOverlay?.addEventListener('click', closeColumnModal)

  const columnModalCloseButton = document.querySelector('#column-modal-close')
  columnModalCloseButton?.addEventListener('click', closeColumnModal)

  const historyClearButton = document.querySelector('#history-clear-btn')
  historyClearButton?.addEventListener('click', () => {
    state.historyRecords = []
    persistHistoryRecords(state.historyRecords)
    state.statusText = '历史记录已清空'
    state.historyOpen = false
    render()
  })

  const restoreButtons = document.querySelectorAll('[data-history-restore]')
  restoreButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const recordId = button.getAttribute('data-history-restore')
      const record = state.historyRecords.find((item) => item.id === recordId)
      if (!record) {
        return
      }
      state.issues = cloneIssues(record.issues)
      state.results = cloneResults(record.results)
      state.activeView = 'result'
      state.lastComputedAt = formatTime(record.createdAt)
      state.statusText = `已恢复历史记录：${state.lastComputedAt}`
      state.historyOpen = false
      state.columnModal = null
      render()
    })
  })

  const deleteButtons = document.querySelectorAll('[data-history-delete]')
  deleteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const recordId = button.getAttribute('data-history-delete')
      state.historyRecords = state.historyRecords.filter((item) => item.id !== recordId)
      persistHistoryRecords(state.historyRecords)
      render()
    })
  })

  const runButton = document.querySelector('#run-btn')
  runButton?.addEventListener('click', () => {
    const allFilled = state.issues.every((issue) => issue.every(Boolean))
    if (!allFilled) {
      state.statusText = '请先填满 3 期全部 4x4 数字后再计算'
      if (state.activeView !== 'input') {
        state.activeView = 'input'
      }
      render()
      return
    }

    const computedResults = inferLotteryResults(state.issues)
    state.results = computedResults
    state.activeView = 'result'
    state.lastComputedAt = formatTime(new Date())
    state.historyRecords = [createHistoryRecord(state.issues, computedResults), ...state.historyRecords].slice(
      0,
      HISTORY_LIMIT,
    )
    persistHistoryRecords(state.historyRecords)
    state.statusText = `计算已完成：${state.lastComputedAt}，已保存到历史记录`
    state.columnModal = null
    render()
  })

  const digitInputs = document.querySelectorAll('.digit-input')
  digitInputs.forEach((input) => {
    input.addEventListener('keydown', onDigitKeyDown)
    input.addEventListener('input', onDigitInput)
  })

  const resultColumnButtons = document.querySelectorAll('[data-column-id]')
  resultColumnButtons.forEach((button) => {
    const columnId = button.getAttribute('data-column-id')
    if (!columnId) {
      return
    }

    button.addEventListener('mouseenter', () => {
      setFocusedColumn(columnId)
    })
    button.addEventListener('mouseleave', () => {
      setFocusedColumn(null)
    })
    button.addEventListener('focus', () => {
      setFocusedColumn(columnId)
    })
    button.addEventListener('blur', () => {
      setFocusedColumn(null)
    })
    button.addEventListener('click', () => {
      openColumnModal(columnId)
    })
  })
}

function closeHistoryPanel() {
  state.historyOpen = false
  render()
}

function closeColumnModal() {
  state.columnModal = null
  render()
}

function setFocusedColumn(columnId) {
  const chips = document.querySelectorAll('.number-chip[data-column-id]')
  chips.forEach((chip) => {
    const currentId = chip.getAttribute('data-column-id')
    chip.classList.toggle('is-column-focused', Boolean(columnId) && currentId === columnId)
  })
}

function openColumnModal(columnId) {
  const matched = findColumnById(state.results, columnId)
  if (!matched) {
    return
  }
  state.columnModal = matched
  render()
}

function findColumnById(results, columnId) {
  for (const group of results) {
    for (const subgroup of group.subgroups) {
      for (let index = 0; index < subgroup.columns.length; index += 1) {
        const column = subgroup.columns[index]
        if (column.id !== columnId) {
          continue
        }
        return {
          groupTitle: group.title,
          subgroupLabel: subgroup.label,
          columnIndex: index + 1,
          digits: [...column.digits],
          picks: column.picks.map((coord) => ({ row: coord.row, col: coord.col })),
        }
      }
    }
  }
  return null
}

function createHistoryRecord(issues, results) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    issues: cloneIssues(issues),
    results: cloneResults(results),
  }
}

function loadHistoryRecords() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.map(normalizeHistoryRecord).filter(Boolean).slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}

function persistHistoryRecords(records) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore quota/security failures and keep app usable.
  }
}

function normalizeHistoryRecord(record) {
  if (!record || typeof record !== 'object') {
    return null
  }
  const id = typeof record.id === 'string' ? record.id : null
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : null
  const issues = Array.isArray(record.issues) ? cloneIssues(record.issues) : null
  const results = Array.isArray(record.results) ? cloneResults(record.results) : null

  if (!id || !createdAt || !issues || !results) {
    return null
  }

  return {
    id,
    createdAt,
    issues,
    results,
  }
}

function cloneIssues(issues) {
  return issues.map((issue) => issue.map((value) => String(value ?? '')))
}

function cloneResults(results) {
  if (!Array.isArray(results) || !results.length) {
    return emptyGroups()
  }

  const normalized = results
    .filter((group) => group && typeof group === 'object')
    .map((group, index) => normalizeResultGroup(group, index))

  if (!normalized.length) {
    return emptyGroups()
  }

  return normalized
}

function normalizeResultGroup(group, index) {
  const groupNumber = index + 1
  const subgroups = Array.isArray(group.subgroups)
    ? normalizeSubgroups(group.subgroups, groupNumber)
    : normalizeLegacyRows(group.rows, groupNumber)

  return {
    title: typeof group.title === 'string' ? group.title : `第${groupNumber}组`,
    subgroups,
  }
}

function normalizeSubgroups(rawSubgroups, groupNumber) {
  const normalized = Array.from({ length: GRID_COLUMNS }, (_, fixedCol) => {
    const raw = rawSubgroups[fixedCol]
    const columns = Array.isArray(raw?.columns)
      ? raw.columns
          .map((column, columnIndex) => normalizeColumn(column, groupNumber, fixedCol, columnIndex))
          .filter(Boolean)
      : []
    return {
      label: typeof raw?.label === 'string' ? raw.label : `${groupNumber}.${fixedCol + 1}`,
      columns,
    }
  })

  return normalized
}

function normalizeLegacyRows(rows, groupNumber) {
  const safeRows = Array.isArray(rows)
    ? rows.slice(0, 3).map((row) => (Array.isArray(row) ? row : []))
    : [[], [], []]

  while (safeRows.length < 3) {
    safeRows.push([])
  }

  const length = Math.max(...safeRows.map((row) => row.length), 0)
  const legacyColumns = []
  for (let columnIndex = 0; columnIndex < length; columnIndex += 1) {
    const digits = safeRows.map((row) => Number(row[columnIndex]))
    if (!digits.every((value) => Number.isInteger(value) && value >= 0 && value <= 9)) {
      continue
    }
    legacyColumns.push({
      id: buildColumnId(groupNumber - 1, 0, columnIndex),
      digits,
      picks: [],
    })
  }

  return Array.from({ length: GRID_COLUMNS }, (_, fixedCol) => ({
    label: `${groupNumber}.${fixedCol + 1}`,
    columns: fixedCol === 0 ? legacyColumns : [],
  }))
}

function normalizeColumn(column, groupNumber, fixedCol, columnIndex) {
  if (!column || typeof column !== 'object') {
    return null
  }

  const digits = Array.isArray(column.digits) ? column.digits.slice(0, 3).map((value) => Number(value)) : []
  if (digits.length !== 3 || !digits.every((value) => Number.isInteger(value) && value >= 0 && value <= 9)) {
    return null
  }

  const picks = Array.isArray(column.picks)
    ? column.picks
        .map((coord) => ({
          row: Number(coord?.row),
          col: Number(coord?.col),
        }))
        .filter(
          (coord) =>
            Number.isInteger(coord.row) &&
            Number.isInteger(coord.col) &&
            coord.row >= 0 &&
            coord.row < GRID_ROWS &&
            coord.col >= 0 &&
            coord.col < GRID_COLUMNS,
        )
    : []

  return {
    id: typeof column.id === 'string' ? column.id : buildColumnId(groupNumber - 1, fixedCol, columnIndex),
    digits,
    picks,
  }
}

function countMatchedColumns(results) {
  return results.reduce((total, group) => {
    const groupTotal = group.subgroups.reduce((subtotal, subgroup) => subtotal + subgroup.columns.length, 0)
    return total + groupTotal
  }, 0)
}

function onDigitKeyDown(event) {
  const commandKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
  if (commandKeys.includes(event.key)) {
    return
  }

  if (!/^[0-9]$/.test(event.key)) {
    event.preventDefault()
  }
}

function onDigitInput(event) {
  const input = event.target
  const issueIndex = Number(input.getAttribute('data-issue-index'))
  const cellIndex = Number(input.getAttribute('data-cell-index'))
  const order = Number(input.getAttribute('data-order'))

  let normalized = input.value.slice(-1)
  if (!/^[0-9]$/.test(normalized)) {
    normalized = ''
  }

  input.value = normalized
  state.issues[issueIndex][cellIndex] = normalized

  if (normalized) {
    const nextInput = document.querySelector(`.digit-input[data-order="${order + 1}"]`)
    if (nextInput) {
      nextInput.focus()
    }
  }
}

function inferLotteryResults(issues) {
  return calculateGroupsFromIssues(issues)
}

function getDefaultResults() {
  return emptyGroups()
}

function calculateGroupsFromIssues(issues) {
  const matrices = issues.map((issue) => normalizeIssueMatrix(issue))
  if (matrices.length < 3) {
    return emptyGroups()
  }

  const firstIssue = matrices[0]
  const secondIssue = matrices[1]
  const thirdIssue = matrices[2]
  const topCoords = []
  for (let row = 0; row < GRID_ROWS - 1; row += 1) {
    for (let col = 0; col < GRID_COLUMNS; col += 1) {
      topCoords.push({ row, col })
    }
  }

  return Array.from({ length: RESULT_GROUP_COUNT }, (_, groupIndex) => {
    const targetDigit = groupIndex
    const subgroups = Array.from({ length: GRID_COLUMNS }, (_, fixedCol) => ({
      label: `${groupIndex + 1}.${fixedCol + 1}`,
      columns: [],
    }))

    for (let fixedCol = 0; fixedCol < GRID_COLUMNS; fixedCol += 1) {
      const secondFixed = secondIssue[GRID_ROWS - 1][fixedCol]
      const firstFixed = firstIssue[GRID_ROWS - 1][fixedCol]
      const thirdFixed = thirdIssue[GRID_ROWS - 1][fixedCol]
      if (secondFixed == null || firstFixed == null || thirdFixed == null) {
        continue
      }

      for (let i = 0; i < topCoords.length - 1; i += 1) {
        for (let j = i + 1; j < topCoords.length; j += 1) {
          const coordA = topCoords[i]
          const coordB = topCoords[j]

          const secondA = secondIssue[coordA.row][coordA.col]
          const secondB = secondIssue[coordB.row][coordB.col]
          const firstA = firstIssue[coordA.row][coordA.col]
          const firstB = firstIssue[coordB.row][coordB.col]
          const thirdA = thirdIssue[coordA.row][coordA.col]
          const thirdB = thirdIssue[coordB.row][coordB.col]

          if (
            secondA == null ||
            secondB == null ||
            firstA == null ||
            firstB == null ||
            thirdA == null ||
            thirdB == null
          ) {
            continue
          }

          const secondDigit = (secondA + secondB + secondFixed) % 10
          if (secondDigit !== targetDigit) {
            continue
          }

          const columnIndex = subgroups[fixedCol].columns.length
          subgroups[fixedCol].columns.push({
            id: buildColumnId(groupIndex, fixedCol, columnIndex),
            digits: [(firstA + firstB + firstFixed) % 10, secondDigit, (thirdA + thirdB + thirdFixed) % 10],
            picks: [
              { row: coordA.row, col: coordA.col },
              { row: coordB.row, col: coordB.col },
              { row: GRID_ROWS - 1, col: fixedCol },
            ],
          })
        }
      }
    }

    return {
      title: `第${groupIndex + 1}组`,
      subgroups,
    }
  })
}

function normalizeIssueMatrix(issue) {
  return Array.from({ length: GRID_ROWS }, (_, row) =>
    Array.from({ length: GRID_COLUMNS }, (_, col) => {
      const rawValue = issue[row * GRID_COLUMNS + col]
      if (rawValue === '') {
        return null
      }
      const value = Number(rawValue)
      if (!Number.isInteger(value) || value < 0 || value > 9) {
        return null
      }
      return value
    }),
  )
}

function emptyGroups() {
  return Array.from({ length: RESULT_GROUP_COUNT }, (_, index) => ({
    title: `第${index + 1}组`,
    subgroups: Array.from({ length: GRID_COLUMNS }, (_, fixedCol) => ({
      label: `${index + 1}.${fixedCol + 1}`,
      columns: [],
    })),
  }))
}

function buildColumnId(groupIndex, fixedCol, columnIndex) {
  return `g${groupIndex + 1}-s${fixedCol + 1}-c${columnIndex + 1}`
}

function formatNumber(number) {
  return String(number)
}

function formatTime(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function brandIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
      <rect x="2" y="3" width="20" height="18" rx="4" fill="currentColor" opacity="0.2"/>
      <path d="M7 8h10M7 12h6M7 16h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `
}

function historyIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.3-5.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M4 4v3.5h3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 8v4l2.5 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `
}

function backIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
      <path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `
}

function panelIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
      <path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `
}

function databaseIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="6.8" ry="2.6" stroke="currentColor" stroke-width="1.7"/>
      <path d="M5.2 6v4.6c0 1.4 3 2.6 6.8 2.6s6.8-1.2 6.8-2.6V6" stroke="currentColor" stroke-width="1.7"/>
      <path d="M5.2 10.6v4.8c0 1.4 3 2.6 6.8 2.6s6.8-1.2 6.8-2.6v-4.8" stroke="currentColor" stroke-width="1.7"/>
    </svg>
  `
}

function trendIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
      <path d="M5 17V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M11 17v-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M17 17v-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="m4.5 10.5 5.5-3 6 2.5 3.5-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `
}
