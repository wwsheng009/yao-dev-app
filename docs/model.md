# Yao Model 配置与使用指南

在 Yao 引擎中，**Model (模型)** 是对数据结构的抽象定义。它通过 DSL (Domain Specific Language) 描述数据表结构、字段类型、校验规则以及加密方式。Yao 的底层引擎（Golang）会解析这些 DSL，自动在数据库中创建或更新表结构（Auto Migration），并提供了一套完整的 CRUD 接口。

## 1\. 文件存放与命名

根据 `yao/model/model.go` 的源码逻辑，Yao 引擎在启动时会扫描应用目录下的 `models` 文件夹。

  * **目录**: `models/`
  * **支持的扩展名**: `*.mod.yao`, `*.mod.json`, `*.mod.jsonc`
  * **命名规范**: 建议使用小写字母，如 `user.mod.yao`。文件路径将直接映射为模型的 ID（例如 `models/admin/user.mod.yao` 的 ID 为 `admin.user`）。

## 2\. DSL 结构详解

一个标准的 Model DSL 文件由 JSON 结构组成，主要包含以下核心部分：

### 2.1 基础元数据 (Metadata)

```json
{
  "name": "User",
  "table": { "name": "user", "comment": "用户表" },
  "option": { "timestamps": true, "soft_deletes": true }
}
```

  * **name**: 模型的显示名称。
  * **table**: 映射到数据库的表配置。
      * `name`: 数据库中的实际表名（引擎会自动加上前缀）。
      * `comment`: 表注释。
  * **option**: ORM 行为配置。
      * `timestamps`: 设为 `true` 会自动创建 `created_at` 和 `updated_at` 字段。
      * `soft_deletes`: 设为 `true` 会自动创建 `deleted_at` 字段，支持软删除。

### 2.2 字段定义 (Columns)

`columns` 数组定义了具体的字段属性。根据 `user.mod.yao` 中的示例，支持丰富的类型和属性：

| 属性 | 类型 | 描述 | 示例 |
| :--- | :--- | :--- | :--- |
| **label** | String | 字段显示标签，用于自动生成 UI。 | "Email" |
| **name** | String | 数据库字段名。 | "email" |
| **type** | String | 数据类型。常见类型：`ID`, `string`, `integer`, `float`, `json`, `enum`, `datetime`。 | "string" |
| **length** | Integer | 字段长度（针对字符串）。 | 256 |
| **comment** | String | 字段注释。 | "用户邮箱" |
| **unique** | Boolean | 是否建立唯一索引。 | true |
| **nullable**| Boolean | 是否允许为 NULL。 | true |
| **index** | Boolean | 是否建立普通索引。 | true |
| **default** | Any | 默认值。 | "admin" |
| **crypt** | String | **加密存储**。支持 `AES` (双向) 和 `PASSWORD` (哈希)。 | "AES" |

-----

### 2.3 数据校验 (Validations)

Yao 允许在 Model 层直接定义数据校验规则，引擎在写入数据前会自动执行检查。

```json
"validations": [
  {
    "method": "typeof",
    "args": ["string"],
    "message": "{{input}} 类型错误"
  },
  {
    "method": "email",
    "args": [],
    "message": "请输入有效的邮箱地址"
  },
  {
    "method": "enum",
    "args": ["admin", "staff"],
    "message": "类型必须是 admin 或 staff"
  }
]
```

  * **method**: 校验方法，Yao 内置了一系列校验器（如 `minLength`, `maxLength`, `enum`, `email`, `mobile` 等）。
  * **args**: 传递给校验方法的参数数组。
  * **message**: 校验失败时的错误提示信息，支持 `{{input}}` 和 `{{label}}` 占位符。

-----

## 3\. 完整配置示例

基于你上传的 `user.mod.yao`，这是一个标准的用户模型配置：

```jsonc
{
  "name": "User",
  "table": { "name": "user", "comment": "User" },
  "columns": [
    { "label": "ID", "name": "id", "type": "ID" },
    {
      "label": "Email",
      "name": "email",
      "type": "string",
      "length": 50,
      "unique": true,
      "nullable": true,
      "validations": [
        { "method": "email", "message": "{{input}} should be email" }
      ]
    },
    {
      "label": "Mobile",
      "name": "mobile",
      "type": "string",
      "length": 50,
      "unique": true,
      "nullable": true,
      "crypt": "AES" // 敏感字段加密存储
    },
    {
      "label": "Password",
      "name": "password",
      "type": "string",
      "length": 256,
      "crypt": "PASSWORD", // 密码哈希存储
      "validations": [
        { "method": "minLength", "args": [6], "message": "密码太短" }
      ]
    },
    {
      "label": "Type",
      "name": "type",
      "type": "enum",
      "default": "admin",
      "option": ["admin", "staff"],
      "index": true
    },
    {
      "label": "Role",
      "name": "roles",
      "type": "json", // JSON 类型支持
      "nullable": true
    }
  ],
  "option": { "timestamps": true, "soft_deletes": true }
}
```

-----

## 4\. 底层加载机制 (Golang 源码解析)

作为高级工程师，理解 Yao 如何加载这些配置有助于你排查问题。根据 `yao/model/model.go` 的源码，加载流程如下：

1.  **初始化加密模块**:
    代码 `model.WithCrypt` 被调用，使用配置中的 `DB.AESKey` 初始化 AES 加密器。这意味着如果在 DSL 中指定了 `"crypt": "AES"`，数据将使用此密钥进行加密入库，读取时自动解密。

2.  **加载系统模型**:
    `loadSystemModels()` 函数会优先加载内置模型（如 `__yao.user`, `__yao.table` 等），确保系统核心表结构就绪。

3.  **扫描应用模型**:
    使用 `application.App.Walk` 遍历 `models` 目录。

      * 读取文件内容。
      * 调用 `model.Load` 将 DSL 解析为 Golang 的结构体对象。
      * **自动迁移**: 加载时，Yao 会对比 DSL 定义和数据库实际结构。如果存在差异（如新增字段），引擎会自动执行 `Migrate` 操作来更新数据库表结构（源码 `dsl/model/model.go` 中的 `Migrate` 调用）。

4.  **数据库动态模型**:
    Yao 支持从数据库中加载模型定义 (`StoreTypeDB`)。这允许在运行时动态创建模型，而不仅仅依赖静态文件。

如果有关于具体字段类型实现或自定义校验器的 Golang 扩展问题，请随时告诉我。