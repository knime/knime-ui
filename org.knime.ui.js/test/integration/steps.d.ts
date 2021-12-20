/// <reference types='codeceptjs' />
type steps_file = typeof import('./steps_file.js');
type KnimeNode = import('./helpers/KnimeNode.js');
type AssertWrapper = import('codeceptjs-assert');
type Workflow = import('./helpers/Workflow.js');

declare namespace CodeceptJS {
  interface SupportObject { I: I, current: any }
  interface Methods extends Puppeteer, KnimeNode, AssertWrapper, Workflow {}
  interface I extends ReturnType<steps_file>, WithTranslation<KnimeNode>, WithTranslation<AssertWrapper>, WithTranslation<Workflow> {}
  namespace Translation {
    interface Actions {}
  }
}
