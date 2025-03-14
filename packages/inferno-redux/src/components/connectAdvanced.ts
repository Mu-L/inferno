import { VNodeFlags } from 'inferno-vnode-flags';
import { type Dispatch, type Store } from 'redux';
import {
  Component,
  createComponentVNode,
  type InfernoNode,
  normalizeProps,
} from 'inferno';
import { Subscription } from '../utils/Subscription';
import { hoistStaticProperties } from 'inferno-shared';

let hotReloadingVersion = 0;
const noop = (): void => {};

const makeSelectorStateful = (
  sourceSelector: (state: any, props: any) => any,
  store: Store<any>,
) => {
  // wrap the selector in an object that tracks its results between runs.
  const selector = {
    error: null as Error | null,
    props: {} as any,
    run: function runComponentSelector(props) {
      try {
        const nextProps = sourceSelector(store.getState(), props);
        if (nextProps !== selector.props || selector.error) {
          selector.shouldComponentUpdate = true;
          selector.props = nextProps;
          selector.error = null;
        }
      } catch (e) {
        selector.shouldComponentUpdate = true;
        selector.error = e;
      }
    },
    shouldComponentUpdate: false,
  };

  return selector;
};

export interface IConnectOptions {
  displayName: string;

  /**
   * the func used to compute this HOC's displayName from the wrapped component's displayName.
   * probably overridden by wrapper functions such as connect().
   *
   * @memberOf IConnectOptions
   */
  getDisplayName: (name: string) => string;

  /**
   * shown in error messages.
   * probably overridden by wrapper functions such as connect()
   *
   * @type {string}
   * @memberOf IConnectOptions
   */
  methodName: string;

  /**
   * if defined, the name of the property passed to the wrapped element indicating the number of
   * calls to render. useful for watching in react devtools for unnecessary re-renders.
   *
   * @type {(string | null)}
   * @memberOf IConnectOptions
   */
  renderCountProp: string | null;

  /**
   * determines whether this HOC subscribes to store changes.
   *
   * @type {boolean}
   * @memberOf IConnectOptions
   */
  shouldHandleStateChanges: boolean;

  /**
   * the key of props/context to get the store.
   *
   * @type {string}
   * @memberOf IConnectOptions
   */
  storeKey: string;

  /**
   * if true, the wrapped element is exposed by this HOC via the getWrappedInstance() function.
   *
   * @type {boolean}
   * @memberOf IConnectOptions
   */
  withRef: boolean;

  initMapStateToProps?: any;

  initMapDispatchToProps?: any;

  initMergeProps?: any;

  pure?: any;

  areStatesEqual?: any;

  areOwnPropsEqual?: any;

  areStatePropsEqual?: any;

  areMergedPropsEqual?: any;

  WrappedComponent?: any;

  wrappedComponentName: string;
}

// TODO: This should be typed better. Spesifically, the output and input props should be generic.
export type SelectorFactory = (
  dispatch: Dispatch<any>,
  options: IConnectOptions,
) => (state: any, props: any) => any;

// TODO: Move
const invariant = (test: boolean, error: string): void => {
  if (!test) {
    throw new Error(error);
  }
};

function getDefaultName(name): string {
  return `ConnectAdvanced(${name})`;
}

export function connectAdvanced(
  selectorFactory: SelectorFactory,
  {
    getDisplayName = getDefaultName,
    methodName = 'connectAdvanced',
    renderCountProp = null,
    shouldHandleStateChanges = true,
    storeKey = 'store',
    withRef = false,
    ...connectOptions
  }: Partial<IConnectOptions>,
): Function {
  const subscriptionKey = storeKey + 'Subscription';
  const version = hotReloadingVersion++;

  const wrapWithConnect = <T extends Function>(WrappedComponent: T): any => {
    invariant(
      typeof WrappedComponent === 'function',
      `You must pass a component to the function returned by ` +
        `connect. Instead received ${WrappedComponent as any}`,
    );

    const wrappedComponentName: string =
      (WrappedComponent as any).displayName ||
      WrappedComponent.name ||
      'Component';

    const displayName = getDisplayName(wrappedComponentName);

    const selectorFactoryOptions: IConnectOptions = {
      ...connectOptions,
      WrappedComponent,
      displayName,
      getDisplayName,
      methodName,
      renderCountProp,
      shouldHandleStateChanges,
      storeKey,
      withRef,
      wrappedComponentName,
    };

    class Connect<P, S> extends Component<P, S> {
      /* eslint-disable */
      // @ts-ignore
      public state: {};
      /* eslint-enable */
      public static displayName = displayName;
      public static WrappedComponent = WrappedComponent;

      public version: number;
      private renderCount: number;
      private readonly propsMode: boolean;
      private store: Store<any> | null;
      private notifyNestedSubs: (() => void) | null;
      private subscription: Subscription | null;
      private wrappedInstance: any;
      private selector: {
        error: Error | null;
        shouldComponentUpdate: boolean;
        props: any;
        run: (props: any) => void;
      };

      constructor(props: P, context?: any) {
        super(props, context);

        this.version = version;
        this.state = {};
        this.renderCount = 0;
        this.store = this.props[storeKey] || this.context[storeKey];
        this.propsMode = Boolean(props[storeKey]);

        this.setWrappedInstance = this.setWrappedInstance.bind(this);

        invariant(
          !!this.store,
          `Could not find "${storeKey}" in either the context or ` +
            `props of "${displayName}". ` +
            `Either wrap the root component in a <Provider>, ` +
            `or explicitly pass "${storeKey}" as a prop to "${displayName}".`,
        );

        this.initSelector();
        this.initSubscription();
      }

      public getChildContext(): Record<string, any> {
        // If this component received store from props, its subscription should be transparent
        // to any descendants receiving store+subscription from context; it passes along
        // subscription passed to it. Otherwise, it shadows the parent subscription, which allows
        // Connect to control ordering of notifications to flow top-down.
        const subscription = this.propsMode ? null : this.subscription;
        return {
          [subscriptionKey]: subscription || this.context[subscriptionKey],
        };
      }

      public componentWillMount(): void {
        if (!shouldHandleStateChanges || this.$SSR) {
          return;
        }

        this.subscription!.trySubscribe();
        this.selector.run(this.props);
      }

      public componentWillReceiveProps(nextProps): void {
        this.selector.run(nextProps);
      }

      public shouldComponentUpdate(): boolean {
        return this.selector.shouldComponentUpdate;
      }

      public componentWillUnmount(): void {
        if (this.subscription) {
          this.subscription.tryUnsubscribe();
        }

        // these are just to guard against extra memory leakage if a parent element doesn't
        // dereference this instance properly, such as an async callback that never finishes
        this.subscription = null;
        this.notifyNestedSubs = noop;
        this.store = null;
        this.selector.run = noop;
        this.selector.shouldComponentUpdate = false;
      }

      public getWrappedInstance() {
        invariant(
          withRef,
          `To access the wrapped instance, you need to specify ` +
            `{ withRef: true } in the options argument of the ${methodName}() call.`,
        );

        return this.wrappedInstance;
      }

      private setWrappedInstance(ref): void {
        this.wrappedInstance = ref;
      }

      public initSelector(): void {
        const sourceSelector = selectorFactory(
          this.store!.dispatch,
          selectorFactoryOptions,
        );
        this.selector = makeSelectorStateful(sourceSelector, this.store!);
        this.selector.run(this.props);
      }

      public initSubscription(): void {
        if (!shouldHandleStateChanges) {
          return;
        }

        // parentSub's source should match where store came from: props vs. context. A component
        // connected to the store via props shouldn't use subscription from context, or vice versa.
        const parentSub = (this.propsMode ? this.props : this.context)[
          subscriptionKey
        ];
        this.subscription = new Subscription(
          this.store!,
          parentSub,
          this.onStateChange.bind(this),
        );

        // `notifyNestedSubs` is duplicated to handle the case where the component is  unmounted in
        // the middle of the notification loop, where `this.subscription` will then be null. An
        // extra null check every change can be avoided by copying the method onto `this` and then
        // replacing it with a no-op on unmount. This can probably be avoided if Subscription's
        // listeners logic is changed to not call listeners that have been unsubscribed in the
        // middle of the notification loop.
        this.notifyNestedSubs = this.subscription.notifyNestedSubs.bind(
          this.subscription,
        );
      }

      private onStateChange(): void {
        this.selector.run(this.props);

        if (!this.selector.shouldComponentUpdate) {
          this.notifyNestedSubs!();
        } else {
          this.componentDidUpdate = this.notifyNestedSubsOnComponentDidUpdate;
          this.setState({});
        }
      }

      private notifyNestedSubsOnComponentDidUpdate(): void {
        // `componentDidUpdate` is conditionally implemented when `onStateChange` determines it
        // needs to notify nested subs. Once called, it unimplements itself until further state
        // changes occur. Doing it this way vs having a permanent `componentDidMount` that does
        // a boolean check every time avoids an extra method call most of the time, resulting
        // in some perf boost.
        this.componentDidUpdate = undefined;
        this.notifyNestedSubs!();
      }

      public isSubscribed(): boolean {
        return Boolean(this.subscription?.isSubscribed());
      }

      private addExtraProps(props: any) {
        if (!renderCountProp) {
          return props;
        }

        // make a shallow copy so that fields added don't leak to the original selector.
        // this is especially important for 'ref' since that's a reference back to the component
        // instance. a singleton memoized selector would then be holding a reference to the
        // instance, preventing the instance from being garbage collected, and that would be bad
        const withExtras = { ...props };

        if (renderCountProp) {
          withExtras[renderCountProp] = this.renderCount++;
        }
        if (this.propsMode && this.subscription) {
          withExtras[subscriptionKey] = this.subscription;
        }
        return withExtras;
      }

      public render(): InfernoNode {
        const selector = this.selector;
        selector.shouldComponentUpdate = false;

        if (selector.error) {
          throw selector.error;
        } else {
          return normalizeProps(
            createComponentVNode(
              VNodeFlags.ComponentUnknown,
              WrappedComponent,
              this.addExtraProps(selector.props),
              null,

              withRef ? this.setWrappedInstance : null,
            ),
          );
        }
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      (Connect.prototype as any).componentWillUpdate =
        function componentWillUpdate() {
          if (this.version !== version) {
            // We are hot reloading!
            this.version = version;
            this.initSelector();

            if (this.subscription) {
              this.subscription.tryUnsubscribe();
            }
            this.initSubscription();
            if (shouldHandleStateChanges) {
              this.subscription.trySubscribe();
            }
          }
        };
    }

    hoistStaticProperties(Connect, WrappedComponent);

    return Connect;
  };

  return wrapWithConnect;
}
