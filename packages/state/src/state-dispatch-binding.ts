
import { type Writable, type IServiceLocator } from '@aurelia/kernel';
import {
  type IOverrideContext,
  Scope,
  type IsBindingBehavior,
  connectable,
  astEvaluate,
  astBind,
  astUnbind,
  IBinding,
  IAstEvaluator,
  IConnectableBinding
} from '@aurelia/runtime';
import { mixinAstEvaluator, mixingBindingLimited } from '@aurelia/runtime-html';
import {
  IAction,
  type IStore
} from './interfaces';
import { createStateBindingScope } from './state-utilities';

/**
 * A binding that handles the connection of the global state to a property of a target object
 */
export interface StateDispatchBinding extends IAstEvaluator, IConnectableBinding { }
export class StateDispatchBinding implements IBinding {
  public isBound: boolean = false;

  /** @internal */
  public readonly l: IServiceLocator;

  /** @internal */
  public _scope?: Scope | undefined;
  public ast: IsBindingBehavior;

  /** @internal */ private readonly _target: HTMLElement;
  /** @internal */ private readonly _targetProperty: string;

  // see Listener binding for explanation
  /** @internal */
  public readonly boundFn = false;
  /** @internal */ private readonly _store: IStore<object>;

  public constructor(
    locator: IServiceLocator,
    expr: IsBindingBehavior,
    target: HTMLElement,
    prop: string,
    store: IStore<object>,
  ) {
    this.l = locator;
    this._store = store;
    this.ast = expr;
    this._target = target;
    this._targetProperty = prop;
  }

  public callSource(e: Event) {
    const scope = this._scope!;
    scope.overrideContext.$event = e;
    const value = astEvaluate(this.ast, scope, this, null);
    delete scope.overrideContext.$event;
    if (!this.isAction(value)) {
      throw new Error(`Invalid dispatch value from expression on ${this._target} on event: "${e.type}"`);
    }
    void this._store.dispatch(value.type, ...(value.params instanceof Array ? value.params : []));
  }

  public handleEvent(e: Event) {
    this.callSource(e);
  }

  public bind(_scope: Scope): void {
    if (this.isBound) {
      return;
    }
    astBind(this.ast, _scope, this);
    this._scope = createStateBindingScope(this._store.getState(), _scope);
    this._target.addEventListener(this._targetProperty, this);
    this._store.subscribe(this);
    this.isBound = true;
  }

  public unbind(): void {
    if (!this.isBound) {
      return;
    }
    this.isBound = false;

    astUnbind(this.ast, this._scope!, this);
    this._scope = void 0;
    this._target.removeEventListener(this._targetProperty, this);
    this._store.unsubscribe(this);
  }

  public handleStateChange(state: object): void {
    const scope = this._scope!;
    const overrideContext = scope.overrideContext as Writable<IOverrideContext>;
    scope.bindingContext = overrideContext.bindingContext = state;
  }

  /** @internal */
  private isAction(value: unknown): value is IAction {
    return value != null
      && typeof value === 'object'
      && 'type' in value;
  }
}

connectable(StateDispatchBinding);
mixinAstEvaluator(true)(StateDispatchBinding);
mixingBindingLimited(StateDispatchBinding, () => 'callSource');
