# 彩票号码推理工具 (Lottery Inference Tool)

一个基于 Vite + 原生 JavaScript 的 H5 推理工具，支持 PC 与移动端浏览，并可通过 Capacitor 打包 Android / iOS App。

## 项目定位

本工具用于对 3 期历史 4x4 数字矩阵进行规则化推理，按“和值个位”条件筛选组合，输出 10 组结果（对应个位 0~9）。

说明：本项目仅用于算法研究与数据演示，不构成任何投注建议。

## 功能清单

- 三期数据录入
- 每期 `4 x 4` 共 16 个输入位
- 支持输入 `0~9`（含 `0`）
- 自动跳转到下一个输入框
- 一键计算，输出 10 组推理结果
- 结果二次分组
- 主分组：`第1组 ~ 第10组`（对应个位 `0~9`）
- 子分组：每组按第二期第四行列坐标拆分为 `x.1 ~ x.4`
- 三行结果同列对齐、横向滚动浏览
- 列交互增强
- 鼠标悬停某一列：同列三行高亮聚焦
- 点击某一列：弹窗显示三期输入表格，并高亮该列对应的 9 个点位
- 历史记录（LocalStorage）
- 自动保存最近计算记录（上限 30 条）
- 支持恢复、删除、清空
- 兼容旧版历史结果结构（旧 `rows` 自动归一）

## 核心算法逻辑

### 1. 输入数据结构

- 共 3 期数据：`issue1`, `issue2`, `issue3`
- 每期为 `4 x 4` 矩阵
- 记第二期第四行为“基准行”，列索引为 `0~3`

### 2. 主分组定义（10组）

- `第1组` 目标个位是 `0`
- `第2组` 目标个位是 `1`
- ...
- `第10组` 目标个位是 `9`

也就是主分组索引 `g (0~9)` 的目标值为 `targetDigit = g`。

### 3. 子分组定义（每组4个）

每个主分组按“第二期第四行固定列”拆为 4 个子分组：

- `x.1`：固定使用第二期第四行第1列
- `x.2`：固定使用第二期第四行第2列
- `x.3`：固定使用第二期第四行第3列
- `x.4`：固定使用第二期第四行第4列

### 4. 组合方式

对每个固定列：

1. 从前三行（第1~3行）共 12 个位置中，取任意两个不同坐标 `(A, B)`，即组合数 `C(12,2)=66`
2. 在第二期计算：
   - `secondDigit = (issue2[A] + issue2[B] + issue2[row4][fixedCol]) % 10`
3. 若 `secondDigit === targetDigit`，该组合命中
4. 使用相同坐标与相同固定列，映射到第一期、第三期计算：
   - `firstDigit = (issue1[A] + issue1[B] + issue1[row4][fixedCol]) % 10`
   - `thirdDigit = (issue3[A] + issue3[B] + issue3[row4][fixedCol]) % 10`
5. 将 `[firstDigit, secondDigit, thirdDigit]` 作为一列追加到当前子分组

### 5. 结果展示含义

每个“结果列”表示一个命中组合：

- 第1行：第一期映射结果个位
- 第2行：第二期命中目标个位（等于该主组目标）
- 第3行：第三期映射结果个位

因此你看到的每组三行是严格列对齐的，一列对应一个真实组合样本。

### 6. 列点击后的“9点高亮”规则

每一列记录 3 个坐标点：

- 前三行中的两个组合点 `(A, B)`
- 第四行固定列点 `(row4, fixedCol)`

在弹窗中，这 3 个坐标会在 3 期输入表中分别高亮，总计 `3 x 3 = 9` 个高亮点。

## 本地开发

```bash
npm install
npm run dev
```

默认建议：

```bash
npm run dev -- --host --port 5173
```

## 构建与预览

```bash
npm run build
npm run preview
```

## 打包 Android / iOS

本项目已接入 Capacitor。

1. 首次添加平台（只需执行一次）

```bash
npm run add:android
npm run add:ios
```

2. 同步 Web 产物到原生工程

```bash
npm run sync:mobile
```

3. 打开原生工程

```bash
npm run open:android
npm run open:ios
```

然后在 Android Studio / Xcode 中进行签名与打包。

## 历史记录说明

- 存储位置：`localStorage`
- Key：`lottery_inference_history_v1`
- 默认最多保留：30 条
- 每条记录包含输入的三期数据、推理结果（主组 + 子组 + 列坐标）和计算时间

## 技术栈

- Vite
- Vanilla JavaScript (ESM)
- CSS
- Capacitor

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。
