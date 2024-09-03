
## 安装

```bash
 npm add @yuanjianming/unplugin-page-api
```

## 基本使用

- 项目目录结构

```bash
├── api                   # 接口目录
  |—— test.ts             # 接口函数
|—— views                 # 入口文件目录
  |—— About
     |—— index.vue        # 入口文件
```

- vite.config.mts

```ts
// vite.config.mts
import { defineConfig } from 'vite'
import { vitePageApiPlugin } from '@yuanjianming/unplugin-page-api'
export default defineConfig({
    //....
    plugins: [vitePlugin()],
})
```

- test.ts

```ts
import request from '@/utils/request.ts'

export function test1(){
    return request({
         url:'xxx'
    })
}
export function test2(){
    return request({
         url:'xxx'
    })
}
```
- xxx.tsx

```ts
import {  test2 } from '@/api/test.ts'
//....
```


- index.vue

```js
import {  test1 } from '@/api/test.ts'
import { schemaDialog } from  '@/schema/xxx.tsx' // 其他页面导入接口
//....
```

## 选项

|  参数   | 类型  | 默认 | 描述 |
|  ----  | ----  | ---- | ---- |
| `entryPaths`  | `string[]` | `['src/views/*/*.vue']` | `Glob`路径语法
| `otherPaths`  | `RegExp[]` | `[/\/schema\/[0-9a-zA-z]+\.tsx/]` | 
其他文件路径的正则匹配
| `importApiReg`  | `RegExp[]` | `[/\/api\//]` | 导入api模块路径





