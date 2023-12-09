export const randomString = () => Math.random().toString(36).substring(2);

export const sleep = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));