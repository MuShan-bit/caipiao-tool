import './style.css'

const ISSUE_COUNT = 3
const GRID_COLUMNS = 4
const GRID_ROWS = 4
const CELLS_PER_ISSUE = GRID_COLUMNS * GRID_ROWS
const RESULT_GROUP_COUNT = 10

const app = document.querySelector('#app')

const state = {
  activeView: 'input',
  statusText: '准备就绪：请输入历史开奖数据以供推理',
  issues: Array.from({ length: ISSUE_COUNT }, () => Array(CELLS_PER_ISSUE).fill('')),
  results: getDefaultResults(),
  lastComputedAt: null,
}

render()

function render() {
  const filledCells = state.issues.flat().filter(Boolean).length
  const fullIssues = state.issues.filter((issue) => issue.every(Boolean)).length

  app.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}

      <div class="workspace">
        <main class="main-zone">
          <div class="status-line">
            <span class="inference-pulse" aria-hidden="true"></span>
            <span>${state.statusText}</span>
          </div>

          ${state.activeView === 'input' ? renderInputView() : renderResultView()}
        </main>

        <aside class="insight-panel" aria-label="数据概览">
          <h2 class="panel-title">推理工作台</h2>
          <div class="insight-card">
            <p class="insight-label">已录入数字</p>
            <p class="insight-value">${filledCells} / ${ISSUE_COUNT * CELLS_PER_ISSUE}</p>
          </div>
          <div class="insight-card">
            <p class="insight-label">完整期数</p>
            <p class="insight-value">${fullIssues} / ${ISSUE_COUNT}</p>
          </div>
          <div class="insight-card is-soft">
            <p class="insight-label">当前规则</p>
            <p class="insight-note">按和值个位数 0~9 分组：每组固定第2行目标个位。</p>
          </div>
          <button class="btn btn-secondary" id="clear-data-btn" type="button">清空全部</button>
        </aside>
      </div>

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
        <button class="icon-btn" type="button" aria-label="状态面板">
          ${panelIcon()}
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
        <button class="icon-btn" type="button" aria-label="历史记录">
          ${historyIcon()}
        </button>
        <button class="icon-btn" type="button" aria-label="设置">
          ${settingsIcon()}
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
                        pattern="[1-9]"
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
        .map(
          (group) => `
            <article class="result-card">
              <div class="result-head">
                <h3 class="result-title">${group.title}</h3>
              </div>
              ${group.rows
                .map((numbers, rowIndex) =>
                  renderResultRow(numbers, rowIndex === 0 ? 'is-primary' : rowIndex === 1 ? 'is-soft' : 'is-neutral'),
                )
                .join('')}
            </article>
          `,
        )
        .join('')}
    </section>
  `
}

function renderResultRow(numbers, chipClassName) {
  return `
    <div class="result-row">
      <div class="chip-list">
        ${numbers
          .map((num) => `<span class="number-chip ${chipClassName}">${formatNumber(num)}</span>`)
          .join('')}
      </div>
    </div>
  `
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

  const clearDataButton = document.querySelector('#clear-data-btn')
  clearDataButton?.addEventListener('click', () => {
    state.issues = Array.from({ length: ISSUE_COUNT }, () => Array(CELLS_PER_ISSUE).fill(''))
    state.statusText = '已清空：请重新输入历史数据'
    render()
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

    state.results = inferLotteryResults(state.issues)
    state.activeView = 'result'
    state.lastComputedAt = formatTime()
    state.statusText = `计算已完成：${state.lastComputedAt}`
    render()
  })

  const digitInputs = document.querySelectorAll('.digit-input')
  digitInputs.forEach((input) => {
    input.addEventListener('keydown', onDigitKeyDown)
    input.addEventListener('input', onDigitInput)
  })
}

function onDigitKeyDown(event) {
  const commandKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
  if (commandKeys.includes(event.key)) {
    return
  }

  if (!/^[1-9]$/.test(event.key)) {
    event.preventDefault()
  }
}

function onDigitInput(event) {
  const input = event.target
  const issueIndex = Number(input.getAttribute('data-issue-index'))
  const cellIndex = Number(input.getAttribute('data-cell-index'))
  const order = Number(input.getAttribute('data-order'))

  let normalized = input.value.slice(-1)
  if (!/^[1-9]$/.test(normalized)) {
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
    const firstRow = []
    const secondRow = []
    const thirdRow = []

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

          firstRow.push((firstA + firstB + firstFixed) % 10)
          secondRow.push(secondDigit)
          thirdRow.push((thirdA + thirdB + thirdFixed) % 10)
        }
      }
    }

    return {
      title: `第${groupIndex + 1}组`,
      rows: [firstRow, secondRow, thirdRow],
    }
  })
}

function normalizeIssueMatrix(issue) {
  return Array.from({ length: GRID_ROWS }, (_, row) =>
    Array.from({ length: GRID_COLUMNS }, (_, col) => {
      const rawValue = issue[row * GRID_COLUMNS + col]
      const value = Number(rawValue)
      if (!Number.isInteger(value) || value < 1 || value > 9) {
        return null
      }
      return value
    }),
  )
}

function emptyGroups() {
  return Array.from({ length: RESULT_GROUP_COUNT }, (_, index) => ({
    title: `第${index + 1}组`,
    rows: [[], [], []],
  }))
}

function formatNumber(number) {
  return String(number)
}

function formatTime() {
  return new Date().toLocaleString('zh-CN', {
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

function settingsIcon() {
  return `
    <svg viewBox="0 0 24 24" fill="none" role="img" aria-hidden="true">
      <path d="M10.3 3h3.4l.6 2.1c.5.2 1 .4 1.4.8l2.1-.6 1.7 3-1.6 1.5c.1.5.1 1.1 0 1.6l1.6 1.5-1.7 3-2.1-.6c-.4.3-.9.6-1.4.8l-.6 2.1h-3.4l-.6-2.1a5.9 5.9 0 0 1-1.4-.8l-2.1.6-1.7-3 1.6-1.5a5.2 5.2 0 0 1 0-1.6L3.4 8.3l1.7-3 2.1.6c.4-.3.9-.6 1.4-.8L10.3 3Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/>
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
