declare const __APP_VERSION__:string;
declare const __COMMIT_SHA__:string;
declare const __BUILD_DIRTY__:boolean;
declare const __BUILD_SOURCE_KIND__:string;
export const buildInfo={version:__APP_VERSION__,commit:__COMMIT_SHA__,dirty:__BUILD_DIRTY__,sourceKind:__BUILD_SOURCE_KIND__};
