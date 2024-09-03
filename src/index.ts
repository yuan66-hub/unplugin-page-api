
import { walk } from 'estree-walker';
import { Glob } from 'glob';
import { normalizePath } from 'vite';
import fs from 'fs';
import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'
import { ProgramNode } from 'rollup';

export interface Options {
    // define your plugin options here
    entryPaths: string[];
    otherPaths: RegExp[];
    importApiReg: RegExp[]
}
interface IRes {
    [propName: string]: string[]
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = options => {
    const entryPaths: string[] = options?.entryPaths || ['src/views/*/*.vue'] // 入口文件Glob path pattern 语法
    const vueReg: RegExp = /\.vue$/;
    const IdMapApis: IRes = {};

    const otherPath: RegExp[] = options?.otherPaths || [/\/schema\/[0-9a-zA-z]+\.tsx/]; //其他文件引入api
    const importApiReg: RegExp[] = options?.importApiReg || [/\/api\//];

    return {
        name: 'unplugin-page-api',
        vite: {
            async buildEnd() {
                const collectApi = (id: string, vueFile: string) => {
                    const ast = this.getModuleInfo(id)?.ast;
                    const vueImportedIds = this.getModuleInfo(id)?.importedIds || [];
                    const importedNames: string[] = []; // 导出声明的api函数 eg: import { test1() } from '@/api/'
                    //  导出声明api
                    walk(ast as ProgramNode, {
                        enter(node) {
                            // 根据导入（/api/）路径查找当前页面的api接口
                            if (node.type === 'ImportDeclaration' && importApiReg.some(reg => reg.test(node.source?.value as string))) {
                                for (let index = 0; index < node.specifiers.length; index++) {
                                    const element: any = node.specifiers[index];
                                    const name = element?.imported?.name || ''
                                    if (name)
                                        importedNames.push(name);
                                }
                            }
                        },
                    });

                    function onPush(val: string) {
                        if (IdMapApis[vueFile]) {
                            IdMapApis[vueFile].push(val);
                        } else {
                            IdMapApis[vueFile] = [val];
                        }
                    }
                    //  收集当前页面api
                    if (importedNames.length) {
                        // 查找api文件
                        vueImportedIds.forEach((apiId) => {
                            if (importApiReg.some(reg => reg.test(apiId))) {
                                const apiAst = this.getModuleInfo(apiId)?.ast;
                                walk(apiAst as ProgramNode, {
                                    enter(node: any) {
                                        if (node.type === 'ExportNamedDeclaration') {
                                            const name = node?.declaration?.id?.name;
                                            if (importedNames.includes(name)) {
                                                // 找出api文件内函数体 url 路径
                                                node.declaration.body.body.forEach((item: any) => {
                                                    if (item.type === 'ReturnStatement') {
                                                        item.argument.arguments.forEach((argument: any) => {
                                                            argument.properties.forEach((propertie: any) => {
                                                                if (propertie.key.name === 'url') {
                                                                    // 模板字符串语法表达式 eg:`/api/${val}`
                                                                    if (propertie.value.type === 'TemplateLiteral') {
                                                                        const quasis = propertie.value.quasis;
                                                                        onPush(quasis.map((item: any) => item.value.raw || '${val}').join(''));
                                                                    } else {
                                                                        onPush(propertie.value.value);
                                                                    }
                                                                }
                                                            });
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    },
                                });
                            }
                        });
                    }
                };
                // 找出页面子组件进行递归处理
                const findChildern = (id: string, arr: any[]) => {
                    const childernImportsIds = this.getModuleInfo(id)?.importedIds || [];
                    childernImportsIds.forEach((item) => {
                        if (otherPath.some((reg) => reg.test(item))) {
                            arr.push(item);
                        } else if (vueReg.test(item)) {
                            const vueChildFile = this.getModuleInfo(item)?.importedIds[0] || '';
                            arr.push(vueChildFile);
                            findChildern(vueChildFile, arr);
                        }
                    });
                    return arr;
                };
                // 列出所有views文件夹下的入口文件
                const g = new Glob(entryPaths, {});
                this.info('\n开始收集.....');
                for await (const file of g) {
                    // 入口文件
                    const realPath = normalizePath(process.cwd() + '/' + file);
                    const moduleInfo = this.getModuleInfo(realPath);
                    if (!moduleInfo) {
                        this.warn(`[${realPath}]在路由文件未引入！！`);
                        continue;
                    }
                    const vueFile = moduleInfo.importedIds[0];
                    // 收集入口文件api
                    collectApi(vueFile, realPath);
                    // 获取导入模块包路径
                    const vueChild = findChildern(vueFile, []); //收集子孙组件

                    // 收集api
                    vueChild.forEach((item) => {
                        collectApi(item, realPath);
                    });
                }
                const jsonData = JSON.stringify(IdMapApis, null, 2);
                fs.writeFileSync('pages-api-data.json', jsonData, 'utf-8')
                this.info('\n收集完成');
            },
        }
    }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export const vitePageApiPlugin = unplugin.vite

