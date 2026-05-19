# 현장도우미 (Hyunjang Doumi) — 韩国工地现场助手

> 面向韩国中小型工装企业的移动端工地协同工具  
> 核心：防窝工 + 跨语言报修 + AI 翻译 + 角色权限  
> 技术栈：React 19 + Vite + TypeScript + Supabase + OpenAI

---

## 一、项目定位

不是 ERP，不是大型工程平台。

**是工长手机里的现场协同工具。**

- 5 秒上手，戴手套也能点（超大按钮）
- 依托 KakaoTalk 生态（Mobile Web H5）
- Google / Kakao / 邮箱 一键登录
- 按工地数量收费，不按人头

### 两种角色

| 角色 | 权限 |
|------|------|
| **현장소장 (所长/Manager)** | 创建工地、邀请工人、查看全部工序、管理工人 |
| **작업자 (工人/Worker)** | 打卡、报修、只看被邀请的工地 |

---

## 二、核心功能模块（v1.1）

### 1. 实名注册 + OAuth 一键登录

```
Google / Kakao / 邮箱 → 填写姓名 + 角色 + 工种 → 进入看板
```

- 强制实名：防止乱打卡、乱报修
- OAuth 一键登录：韩国人用 Kakao/Google，中国人用邮箱
- 微信登录即将推出

### 2. 红绿灯看板（Dashboard）

```
┌─────────────────────────┐
│  김과장 (所长)          │
│  강남 리모델링 [＋]    │
│                         │
│  🔴 有延误 → 红灯       │
│  🟡 施工中 → 黄灯       │
│  🟢 全完成 → 绿灯       │
│                         │
│  [管理工人]             │
└─────────────────────────┘
```

- 所长：看自己创建的所有工地
- 工人：只看被邀请的工地
- 红/黄/绿自动聚合指示

### 3. 下班强制打卡（CheckIn）

```
选工地 → 选工序 → 完工/延误半天/延误一天 → 拍照 → 提交
```

- 延误状态自动更新工序红绿灯
- 照片存储到 Supabase Seoul 区域

### 4. 跨语言报修（Report）

```
拍照 → 画圈标注 → 点选问题标签 → 按住录音 → AI 翻译为韩文 → 发送
```

- 问题标签：漏水/不平整/裂缝/防水/不洁净/其他
- AI：Whisper 语音转文字 → GPT-4o-mini 翻译
- 支持韩/中/英三语界面切换

### 5. 工人管理（Workers）

- 所长邀请工人加入工地
- 查看已注册工人列表（姓名+工种）
- 删除工人

---

## 三、技术架构

```
┌──────────────────────────────────────┐
│  前端: React 19 + Vite + TypeScript  │
│  i18n: react-i18next (韩/中/英)      │
│  路由: React Router v7               │
│  画圈: 原生 Canvas API               │
└──────────────┬───────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────┐      ┌──────────────┐
│ Supabase │      │ OpenAI API   │
│ (Seoul)  │      │              │
│ Auth     │      │ Whisper STT  │
│ Database │      │ GPT-4o-mini  │
│ Storage  │      │              │
└──────────┘      └──────────────┘
```

---

## 四、数据库设计

### 表结构

```
profiles (实名档案)
  ├── id, role(manager/worker), real_name, phone, trade

sites (工地)
  ├── id, name, address, owner_id

site_workers (工地-工人关联)
  ├── id, site_id, worker_id, invited_by

processes (工序)
  ├── id, site_id, name, status(pending/in_progress/delayed/completed)

checkins (打卡记录)
  ├── id, site_id, process_id, user_id, status, photo_url

issue_reports (报修记录)
  ├── id, site_id, user_id, photo_url, annotated_photo_url, tag
  ├── voice_text_ko, voice_text_orig
```

### 权限（Row Level Security）

- 所长：CRUD 自己创建的 sites、processes、checkins、reports
- 工人：只能查看/操作被邀请工地的数据
- 所有实名档案本人可编辑，所长可查看工人档案

---

## 五、部署指南

### 环境变量

| Key | 说明 |
|-----|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_OPENAI_API_KEY` | OpenAI API Key |
| `VITE_SITE_URL` | 部署后的网站 URL（OAuth 回调用） |

### Supabase 初始化

依次运行以下 SQL：
1. `supabase/schema.sql` — 基础建表
2. `supabase/migration_v1.1.sql` — 角色+实名系统

### OAuth 配置

| 平台 | 配置位置 | 回调 URL |
|------|----------|----------|
| Google | Google Cloud Console | `https://你的ID.supabase.co/auth/v1/callback` |
| Kakao | Kakao Developers | 同上 |
| 微信 | 即将推出 | - |

### Vercel 部署

1. 推送到 GitHub → Vercel 自动部署
2. Framework: Vite, Root: frontend
3. 填入环境变量

---

## 六、文件结构

```
hyunjang-doumi/
├── frontend/
│   ├── src/
│   │   ├── i18n/                 # 国际化（ko/zh/en）
│   │   ├── lib/
│   │   │   ├── supabase.ts       # Supabase 客户端 + 类型
│   │   │   └── openai.ts         # AI 接口
│   │   ├── components/
│   │   │   ├── Layout.tsx         # 导航 + 语言切换
│   │   │   ├── StatusBadge.tsx    # 红绿灯徽章
│   │   │   └── PhotoAnnotate.tsx  # Canvas 画圈
│   │   ├── pages/
│   │   │   ├── Login.tsx          # OAuth + 邮箱登录
│   │   │   ├── ProfileSetup.tsx   # 实名注册
│   │   │   ├── Dashboard.tsx      # 看板（所长/工人双视图）
│   │   │   ├── CheckIn.tsx        # 下班打卡
│   │   │   ├── Report.tsx         # 报修+AI翻译
│   │   │   └── Workers.tsx        # 工人管理
│   │   └── App.tsx                # 路由 + 角色守卫
│   └── .env.example
├── supabase/
│   ├── schema.sql                 # 基础建表
│   └── migration_v1.1.sql        # 角色系统迁移
├── docs/
│   └── manual.md                  # 中韩双语操作手册
└── README.md
```

---

## 七、GitHub

https://github.com/wangxiuling2009-ops/hyunjang-doumi

---

> **核心壁垒：你就在工地。** 每天观察、测试、拿反馈 — 写字楼里的团队没有这个优势。
