
# Yao Connector 配置指南

## 1\. 概述

在 Yao 框架中，`Connector` 用于连接外部服务（如数据库、Redis、AI 模型等）。底层的 Golang 实现基于 `connector.Connector` 接口，它定义了连接器的注册、查询、Schema 获取等通用行为。

配置文件通常存放于应用目录的 `connectors/` 下，文件后缀为 `.conn.yao`。

## 2\. 通用 DSL 结构

所有连接器配置都遵循 `DSL` 结构体定义。

```json
{
  "LANG": "1.0.0",
  "VERSION": "1.0.0",
  "label": "连接器名称",
  "type": "类型标识",
  "options": {
    // 具体类型的配置项
  }
}
```

  * **type**: 决定了底层初始化哪个 Go 结构体（如 `mysql` 对应 `database.Xun`，`redis` 对应 `redis.Connector`）。
  * **options**: 对应 Go 结构体中的 `Options` 字段，支持使用 `$ENV.变量名` 读取环境变量。

-----

## 3\. 数据库连接器 (Database)

数据库连接器在底层映射为 `database.Xun` 结构体。它支持 MySQL, SQLite3, Postgres, Oracle 等驱动。

### 支持类型 (`type`)

  * `mysql`
  * `sqlite`, `sqlite3`
  * `postgres`
  * `oracle`

### 配置详解 (`options`)

基于 `database/xun.go` 中的 `XunOptions` 结构体分析：

| 字段 | 类型 | 说明 | 对应 Go 字段 |
| :--- | :--- | :--- | :--- |
| `db` | String | 数据库名称 | `DB` |
| `prefix` | String | 表前缀 | `TablePrefix` |
| `charset` | String | 字符集 (如 `utf8mb4`) | `Charset` |
| `collation`| String | 排序规则 | `Collation` |
| `parseTime`| Bool | 是否解析时间 (MySQL推荐 true) | `ParseTime` |
| `timeout` | Int | 连接超时时间（秒），默认 5 | `Timeout` |
| `file` | String | SQLite 文件路径 (仅 SQLite 需要) | `File` |
| `hosts` | Array | 主机列表，支持读写分离 | `Hosts` |

### Hosts 配置

`hosts` 是一个数组，支持配置主从库。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `host` | String | 主机地址 |
| `port` | String | 端口 (MySQL默认3306, PG默认5432) |
| `user` | String | 用户名 |
| `pass` | String | 密码 |
| `primary`| Bool | 是否为主库 (写库)。如果为 `true` 则用于写操作。 |

### 示例：MySQL (支持读写分离)

参考自 `gou-dev-app` 示例：

```json
{
  "label": "MySQL 8.0 TEST",
  "type": "mysql",
  "version": "8.0.26",
  "options": {
    "db": "test",
    "charset": "utf8mb4",
    "parseTime": true,
    "hosts": [
      {
        "host": "$ENV.MYSQL_TEST_HOST",
        "port": "$ENV.MYSQL_TEST_PORT",
        "user": "$ENV.MYSQL_TEST_USER",
        "pass": "$ENV.MYSQL_TEST_PASS",
        "primary": true 
      },
      {
        "host": "$ENV.MYSQL_TEST_HOST_SLAVE", 
        "port": "$ENV.MYSQL_TEST_PORT",
        "user": "$ENV.MYSQL_TEST_USER",
        "pass": "$ENV.MYSQL_TEST_PASS"
      }
    ]
  }
}
```

-----

## 4\. Redis 连接器

底层映射为 `redis.Connector` 结构体，使用 `go-redis/redis/v8` 客户端。

### 支持类型 (`type`)

  * `redis`

### 配置详解 (`options`)

基于 `redis/redis.go` 中的 `Options` 结构体分析：

| 字段 | 类型 | 说明 | 默认值 |
| :--- | :--- | :--- | :--- |
| `host` | String | Redis 主机地址 | 必填 |
| `port` | String | 端口 | "6379" |
| `user` | String | 用户名 (Redis 6.0+ ACL) | - |
| `pass` | String | 密码 | - |
| `db` | String | 数据库索引 | "0" |
| `timeout`| Int | 连接超时（秒） | 5 |

### 示例：Redis

参考自 `gou-dev-app` 示例：

```json
{
  "label": "Redis TEST",
  "type": "redis",
  "options": {
    "host": "$ENV.REDIS_TEST_HOST",
    "port": "$ENV.REDIS_TEST_PORT",
    "user": "$ENV.REDIS_TEST_USER", 
    "pass": "$ENV.REDIS_TEST_PASS",
    "db": "1"
  }
}
```

-----

## 5\. OpenAI 连接器 (AI)

底层映射为 `openai.Connector`。这类连接器会被特殊处理，自动加入到 `AIConnectors` 列表中。

### 支持类型 (`type`)

  * `openai`

### 配置详解 (`options`)

基于 `openai/openai.go` 中的 `Options` 结构体分析：

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `model` | String | 模型名称 (如 `gpt-4o`, `gpt-3.5-turbo`) |
| `key` | String | API Key |
| `host` | String | API 端点 (默认为 `https://api.openai.com`) |
| `proxy` | String | (已废弃) 代理地址，建议使用 `host` 或环境变量配置 |
| `azure` | String | 是否为 Azure OpenAI ("true" / "false") |

> **注意**: 代理设置建议通过环境变量 `HTTPS_PROXY` 或 `HTTP_PROXY` 在系统层面配置，Go 的 `http.GetTransport` 会自动处理。

### 示例：OpenAI

```json
{
  "label": "GPT-4",
  "type": "openai",
  "options": {
    "model": "gpt-4",
    "key": "$ENV.OPENAI_API_KEY",
    "host": "https://api.openai.com" 
  }
}
```

## 6\. MongoDB 连接器 (Mongo)

底层映射为 `mongo.Connector` 结构体，使用官方 `go.mongodb.org/mongo-driver/mongo` 驱动进行连接。

### 支持类型 (`type`)

  * `mongo`

### 配置详解 (`options`)

基于 `connector/mongo/mongo.go` 中的 `Options` 结构体分析：

| 字段 | 类型 | 说明 | 对应 Go 字段 | 必填 |
| :--- | :--- | :--- | :--- | :--- |
| `db` | String | 数据库名称 | `DB` | 是 |
| `hosts` | Array | 主机列表，支持集群配置 | `Hosts` | 是 |
| `timeout` | Int | 连接超时时间（秒），默认 5 | `Timeout` | 否 |
| `params` | Map | 额外的 URI 参数 (如连接池大小、写入关注等) | `Params` | 否 |

### Hosts 配置

`hosts` 是一个对象数组，用于构建 `mongodb://user:pass@host:port,.../` 格式的连接串。

| 字段 | 类型 | 说明 | 默认值 | 必填 |
| :--- | :--- | :--- | :--- | :--- |
| `host` | String | 主机地址 | - | **是** |
| `port` | String | 端口 | "27017" | 否 |
| `user` | String | 用户名 | - | **是** |
| `pass` | String | 密码 | - | **是** |

> **Gou Dev 提示**: 代码逻辑 `getDSN` 中强制校验了 `User` 和 `Pass` 字段不能为空。如果你的 MongoDB 是无密码访问的（通常不建议），可能需要修改底层源码或填写占位符。

### Params 配置

`params` 字段是一个键值对映射，它会被直接转换为连接字符串的 Query 参数（例如 `?maxPoolSize=20&w=majority`）。这是配置连接池大小、读写偏好（ReadPreference）等高级选项的地方。

### 示例：MongoDB

参考自 `gou-dev-app` 示例：

```json
{
  "label": "Mongo TEST",
  "type": "mongo",
  "options": {
    "db": "test",
    "hosts": [
      {
        "host": "$ENV.MONGO_TEST_HOST",
        "port": "$ENV.MONGO_TEST_PORT",
        "user": "$ENV.MONGO_TEST_USER",
        "pass": "$ENV.MONGO_TEST_PASS"
      }
    ],
    "params": { 
      "maxPoolSize": 20, 
      "w": "majority" 
    }
  }
}
```

-----

**技术总结**:
MongoDB 连接器的实现非常直接，它将配置选项组装成标准的 Connection String URI，然后传递给驱动。这种设计的好处是你可以在 `params` 中使用任何官方驱动支持的 URI 参数，具有很高的灵活性。

-----

## 总结

配置文件的解析核心在于 `application.Parse` 以及随后的 `helper.EnvString` 处理。这意味着你几乎可以在所有 Option 值中使用环境变量，这对于这就意味着敏感信息（如密码、API Key）不应硬编码在 `.conn.yao` 文件中，而是通过 `.env` 文件管理。