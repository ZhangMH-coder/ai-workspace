/**
 * Services 入口：双模式选择（P4-2f）
 *
 * - 默认 Real（HTTP + SQLite）；`NEXT_PUBLIC_USE_MOCK=1` 时回退 Mock（回滚手段）
 * - 入口保持同名函数，Store/组件 import 路径不变、签名不变
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

export { USE_MOCK as __USE_MOCK__ };
