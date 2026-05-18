# 현장도우미 (Hyunjang Doumi) — 韩国工地现场助手

> 面向韩国中小型工装企业的移动端工地协同工具  
> 核心：防窝工 + 跨语言报修 + AI 翻译  
> 技术栈：React + Vite + Supabase + OpenAI

---

## 一、项目定位

不是 ERP，不是大型工程平台。

**是工长手机里的现场协同工具。**

- 5 秒上手
- 戴手套也能点（超大按钮）
- 依托 KakaoTalk 生态（Mobile Web H5）
- 按工地数量收费，不按人头

**目标用户：**
- 第一阶段：韩国中小型工地工长（반장），30~60 岁
- 第二阶段：小包工头、外国人工队、现场负责人

---

## 二、核心痛点与解决方案

| 痛点 | 现状 | 解决方案 |
|------|------|----------|
| **窝工（데마찌）** | 前道工序延误，后道班组按计划进场后干等，老板仍需支付全额日薪（15-30 万韩元/人） | 下班强制打卡 → 延误自动通知后道 → 红绿灯看板 |
| **沟通黑洞** | 中/越外籍劳工与韩国所长语言不通，质量问题无法即时上报，导致"带病施工"返工 | 拍照画圈 + 点击标签 + AI 语音翻译 |
| **日报低效** | 拍照→发群→写日报→向上汇报，重复劳动 | 语音输入 → AI 自动生成日报（后续版本） |
| **打卡混乱** | Excel、手写、群截图，后期对账麻烦 | 统一打卡记录，带照片和时间戳 |

---

## 三、MVP 功能模块（v1.0）

### 模块 A：红绿灯看板（Dashboard）

```
┌─────────────────────────────────┐
│  Site Status            🟢🟡🔴  │  ← 红/黄/绿 圆形指示灯
│                                 │
│  [강남 리모델링] [홍대 카페] [+]│  ← 工地选择器
│                                 │
│  ┌─────────────────────────────┐│
│  │ 목공 (木工)     ✅ 완료    ││
│  │ 전기 (电气)     🔴 지연    ││
│  │ 설비 (水电)     🟡 진행중  ││
│  │ 도배 (油漆)     ⚪ 대기    ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

- 工序状态：대기(等待) / 진행중(进行中) / 지연(延误) / 완료(完成)
- 红绿灯自动聚合：任一工序延误 → 红灯，有进行中 → 黄灯，全部完成 → 绿灯

### 模块 B：下班强制打卡（CheckIn）

```
[下班 17:00] → 选工序 → 选状态 → 拍照 → 提交

状态三选一：
  ✅ 완료 (完工)
  🕐 반일 연기 (延误半天)
  🔴 하루 연기 (延误一天)
```

选"延误"后 → **自动触发 Kakao 通知**（后续接入 알림톡）→ 后道班组长 & 所长收到预警

### 模块 C：跨语言报修（Report）

```
拍照 → 在照片上画圈标注 → 点选问题标签 → 按住语音说明 → AI 翻译为韩文 → 发送
```

**问题标签（一键点击，无需打字）：**
- 누수 (漏水)
- 평활도 불량 (不平整)
- 크랙 (裂缝)
- 방수 문제 (防水问题)
- 청소 불량 (不洁净)
- 기타 (其他)

**AI 语音翻译链路：**
```
工人说中文 → 按住录音 → Whisper 转文字 → GPT-4o-mini 翻译为韩文 → 显示双语
```

---

## 四、技术架构

```
┌──────────────────────────────────────┐
│  前端: React 19 + Vite + TypeScript  │
│  样式: Tailwind CSS v4               │
│  路由: React Router v7               │
│  图标: Lucide React                  │
│  画圈: 原生 Canvas API               │
└──────────────┬───────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────┐      ┌──────────────┐
│ Supabase │      │ OpenAI API   │
│ (首尔区) │      │              │
│          │      │ Whisper STT  │
│ Auth     │      │ GPT-4o-mini  │
│ Database │      │ (翻译+日报)  │
│ Storage  │      │              │
└──────────┘      └──────────────┘
```

**为什么选这个技术栈：**
- React + Vite：出活最快，Hot Reload，PWA 支持
- Supabase：自带 Auth + 数据库 + 存储 + RLS 权限，独立开发者首选
- OpenAI：按量付费，前期成本几乎为零，不自己训练模型
- 原生 Canvas：画圈标注零依赖，React 19 兼容无问题

---

## 五、数据库设计（Supabase PostgreSQL）

### 表结构总览

```
sites (工地)
  ├── id, name, address, owner_id, created_at
  │
  ├──< processes (工序)
  │     ├── id, site_id, name, display_order, status, updated_at
  │     │
  │     └──< checkins (打卡记录)
  │           ├── id, site_id, process_id, user_id
  │           ├── status: completed | delayed_half | delayed_full
  │           ├── photo_url, note, created_at
  │
  └──< issue_reports (报修记录)
        ├── id, site_id, user_id
        ├── photo_url, annotated_photo_url
        ├── tag: nusu | keuraek | bangsu | pyeonghwaldo | cheongso | gita
        ├── voice_text_ko, voice_text_orig, created_at
```

### 安全策略（Row Level Security）

所有表启用 RLS，用户只能访问自己工地的数据：
- sites：`auth.uid() = owner_id`
- processes / checkins / issue_reports：通过 `EXISTS` 子查询关联 site 的 owner

### 存储桶

| 桶名 | 用途 | 权限 |
|------|------|------|
| `checkin-photos` | 打卡现场照片 | 公开读，认证用户写 |
| `report-photos` | 报修照片 + 标注图 | 公开读，认证用户写 |

---

## 六、项目文件结构

```
hyunjang-doumi/
├── frontend/                      # React + Vite 前端
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabase.ts        # Supabase 客户端 + 类型定义
│   │   │   └── openai.ts          # Whisper STT + GPT 翻译 + 日报生成
│   │   ├── components/
│   │   │   ├── Layout.tsx          # 底部三 Tab 导航
│   │   │   ├── StatusBadge.tsx     # 红绿灯状态徽章
│   │   │   └── PhotoAnnotate.tsx   # Canvas 画圈标注组件
│   │   ├── pages/
│   │   │   ├── Login.tsx           # 登录/注册 (Supabase Auth)
│   │   │   ├── Dashboard.tsx       # 红绿灯看板 + 工序列表
│   │   │   ├── CheckIn.tsx         # 下班强制打卡 + 拍照
│   │   │   └── Report.tsx          # 拍照→画圈→语音→翻译→发送
│   │   ├── App.tsx                 # 路由 + 登录保护
│   │   ├── main.tsx                # 入口
│   │   └── index.css               # Tailwind + 移动端适配
│   ├── .env.example                # 环境变量模板
│   └── vite.config.ts              # Vite 配置
├── supabase/
│   └── schema.sql                  # 完整建表 SQL + RLS + 存储桶
└── .gitignore
```

---

## 七、部署指南

### 7.1 本地开发

```bash
cd frontend
npm install
cp .env.example .env          # 编辑 .env 填入真实值
npm run dev                    # 启动 → http://localhost:3000
```

### 7.2 部署到 Vercel（推荐）

1. 代码推送到 GitHub
2. 打开 https://vercel.com → 用 GitHub 登录
3. **New Project** → 导入仓库 `hyunjang-doumi`
4. 配置：
   - Framework Preset: **Vite**
   - Root Directory: **frontend**
5. 添加环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`
6. 点 **Deploy**
7. 以后每次 `git push` 自动部署

### 7.3 Supabase 初始化

在 Supabase SQL Editor 中运行 `supabase/schema.sql`，一步完成：
- 4 张业务表
- RLS 安全策略
- 2 个存储桶（checkin-photos, report-photos）

---

## 八、环境变量

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | Supabase → Settings → API → anon public key |
| `VITE_OPENAI_API_KEY` | OpenAI API 密钥 | https://platform.openai.com/api-keys |

---

## 九、测试流程

### 9.1 零配置看界面（无需任何账号）

```bash
cd frontend && npm run dev
# 打开 http://localhost:3000
```

可看到登录页布局、输入框、按钮样式。

### 9.2 完整功能测试

1. **注册 Supabase** → 创建项目，Region 选 Seoul
2. **建表** → SQL Editor 运行 schema.sql
3. **配置 .env** → 填入 Supabase URL + anon key
4. **注册账号** → 登录页点 Sign Up，输入邮箱密码
5. **创建工地** → Dashboard 点 + 按钮
6. **打卡测试** → CheckIn 页，选工序 → 选状态 → 拍照 → 提交
7. **报修测试** → Report 页，拍照 → 画圈 → 选标签 → 录音 → 翻译

### 9.3 手机端测试

Vercel 部署后，用手机浏览器打开部署链接。在工地环境中测试：
- 手套操作（大按钮是否可点）
- 拍照功能（调用手机摄像头）
- 录音功能（调用手机麦克风）
- Kakao 内置浏览器兼容性

---

## 十、商业化定价

按工地数量收费（不按人头，工地人员流动大）：

| 套餐 | 价格（韩元/月） | 工地数 | 功能 |
|------|----------------|--------|------|
| 체험판 (体验版) | 49,000 | 1 个 | 基础打卡 + 拍照 |
| 일반 (标准版) | 99,000 | 3 个 | 全部功能（预警 + AI 翻译） |
| 프리미엄 (企业版) | 249,000 | 无限 | + 导出数字化验收档案 |

**销售话术：**
> "只要本系统帮您在一个月里成功阻止一次无效出工（데마찌），帮您省下的 20 万韩元工费，就足够付 3 个月的标准版软件费。"

---

## 十一、开发路线图

| 阶段 | 时间 | 内容 |
|------|------|------|
| **MVP v1.0** | ✅ 已完成 | 看板 + 打卡 + 报修 + AI 翻译 |
| **冷启动** | 第 1-3 周 | 真实工地测试，收集反馈 |
| **v1.1** | 第 4-6 周 | Kakao 알림톡 预警推送 + 工序管理完善 |
| **v1.2** | 第 7-8 周 | AI 日报生成 + 多语言 UI（中/韩/越） |
| **v2.0** | 第 3 个月 | 安全早会记录 + 出勤统计 + 导出 |

---

## 十二、联系方式

- GitHub: https://github.com/wangxiuling2009-ops/hyunjang-doumi
- 部署后链接: https://hyunjang-doumi.vercel.app（待部署）

---

> **核心壁垒：你就在工地。** 这比任何技术都重要。每天观察流程、测试功能、拿到反馈——这是任何写字楼里的开发团队不具备的优势。
