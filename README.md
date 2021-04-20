# `@shop0/shop0-api`

<!-- ![Build Status]() -->

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)
[![npm version](https://badge.fury.io/js/%40shop0%2Fshop0-api.svg)](https://badge.fury.io/js/%40shop0%2Fshop0-api)

支持 TypeScript/JavaScript [shop0](https://www.shop0.com) 应用访问 [shop0 Admin API](https://shop0.dev/docs/admin-api), by making it easier to perform the following actions:

- Creating [online](https://shop0.dev/concepts/about-apis/authentication#online-access) or [offline](https://shop0.dev/concepts/about-apis/authentication#offline-access) access tokens for the Admin API via OAuth
- 调用 [REST API](https://shop0.dev/docs/admin-api/rest/reference)
- 调用 [GraphQL API](https://shop0.dev/docs/admin-api/graphql/reference)
- 注册/处理 webhooks

此 SDK 提供给 Node.js 后端应用使用, 不依赖特殊的框架，所以你可以在任何技术栈中使用.

# Requirements

To follow these usage guides, you will need to:

- have a basic understanding of [Node.js](https://nodejs.org)
- 拥有 shop0 开发者账号和可测试店铺
- _OR_ 针对店铺创建私有 APP
- have a private or custom app already set up in your test store or partner account
- 采用 [ngrok](https://ngrok.com), 可以在你本机创建一个应用的反向代理安全通道
- add the `ngrok` URL and the appropriate redirect for your OAuth callback route to your app settings
- have [yarn](https://yarnpkg.com) installed

<!-- Make sure this section is in sync with docs/README.md -->

# 开始使用

您可以参考我们的 [入门指南](docs/), 它将提供有关如何使用原始Node.js代码来创建应用程序的说明, 或采用[Express](https://expressjs.com/) 框架. 两种例子都采用Typescript编码.

- [入门指南](docs/getting_started.md)
  - [安装依赖](docs/getting_started.md#install-dependencies)
  - [设置基本文件](docs/getting_started.md#set-up-base-files)
  - [设置环境](docs/getting_started.md#set-up-environment)
  - [设置上下文](docs/getting_started.md#set-up-context)
  - [运行app](docs/getting_started.md#running-your-app)
- [执行OAuth](docs/usage/oauth.md)
  - [添加路由来启用OAuth](docs/usage/oauth.md#add-a-route-to-start-oauth)
  - [添加OAuth回调路由](docs/usage/oauth.md#add-your-oauth-callback-route)
  - [获取sessions](docs/usage/oauth.md#fetching-sessions)
  - [检测scope变更](docs/usage/oauth.md#detecting-scope-changes)
- [发起 REST API 调用](docs/usage/rest.md)
- [发起 GraphQL API 调用](docs/usage/graphql.md)
- [Webhooks](docs/usage/webhooks.md)
  - [注册 Webhook](docs/usage/webhooks.md#register-a-webhook)
  - [执行 Webhook](docs/usage/webhooks.md#process-a-webhook)
- [已知问题和注意事项](docs/issues.md)
  - [会话处理说明](docs/issues.md#notes-on-session-handling)
