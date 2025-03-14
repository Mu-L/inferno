import { cloneVNode } from 'inferno-clone-vnode';
import {
  Component,
  createTextVNode,
  Fragment,
  InfernoNode,
  type InfernoSingleNode,
  render,
  type VNode,
} from 'inferno';

describe('cloneVNode (JSX)', () => {
  let container;

  beforeEach(function () {
    container = document.createElement('div');
  });

  it('should clone a tag', () => {
    const node = cloneVNode(<a />, null);
    render(node, container);
    expect(container.innerHTML).toBe('<a></a>');
  });

  it('should clone with third argument array', () => {
    const node = cloneVNode(<div />, null, [<span />]);
    render(node, container);
    expect(container.innerHTML).toBe('<div><span></span></div>');
  });

  it('should clone with third argument overriding props and cloned node children', () => {
    const node = cloneVNode(<div>f</div>, { children: 'x' }, [<a>1</a>]);
    render(node, container);
    expect(container.innerHTML).toBe('<div><a>1</a></div>');
  });

  it('should clone with third argument overriding props and cloned node children', () => {
    const node = cloneVNode(<div>f</div>, { children: 'x' }, [undefined]);
    render(node, container);
    expect(container.innerHTML).toBe('<div></div>');
  });

  it('should clone OPT_ELEMENT', () => {
    const noop = () => {};
    // noinspection HtmlUnknownAttribute
    const node = cloneVNode(
        // @ts-expect-error
        // eslint-disable-next-line inferno/no-unknown-property
      <div onComponentWillMount={noop} onComponentDidMount={noop} onComponentWillUnmount={noop} onComponentShouldUpdate={noop} onComponentWillUpdate={noop} />,
      { children: [<span />] }
    );
    render(node, container);
    expect(container.innerHTML).toBe('<div><span></span></div>');
  });

  it('should clone a basic element with array children', () => {
    const node = cloneVNode(<div />, { children: [<span />] });
    render(node, container);
    expect(container.innerHTML).toBe('<div><span></span></div>');
  });

  it('should clone a basic element with children in props and as third argument', () => {
    const node1 = cloneVNode(
      <div />,
      { children: <span>arr1a</span> },
      <span>arr2b</span>,
    );
    render(node1, container);
    expect(container.innerHTML).toBe('<div><span>arr2b</span></div>');

    const node2 = cloneVNode(
      <div />,
      { children: [<span>arr2a</span>] },
      <span>arr2b</span>,
    );
    render(node2, container);
    expect(container.innerHTML).toBe('<div><span>arr2b</span></div>');

    const node3 = cloneVNode(<div />, { children: [<span>arr3a</span>] }, [
      <span>arr3b</span>,
    ]);
    render(node3, container);
    expect(container.innerHTML).toBe('<div><span>arr3b</span></div>');
  });

  it('Should support multiple parameters as children', () => {
    // @ts-ignore
    const node = cloneVNode(
      <div />,
      null,
      <span>arr3a</span>,
      <span>arr3b</span>,
      <span>arr3c</span>,
    );
    render(node, container);
    expect(container.innerHTML).toBe(
      '<div><span>arr3a</span><span>arr3b</span><span>arr3c</span></div>',
    );
  });

  it('Should support multiple nodes as children inside array', () => {
    const node = cloneVNode(<div />, null, [
      <span>arr3a</span>,
      <span>arr3b</span>,
      <span>arr3c</span>,
    ]);
    render(node, container);
    expect(container.innerHTML).toBe(
      '<div><span>arr3a</span><span>arr3b</span><span>arr3c</span></div>',
    );
  });

  it('Should support single node as children', () => {
    const node = cloneVNode(<div />, null, <span>arr3a</span>);
    render(node, container);
    expect(container.innerHTML).toBe('<div><span>arr3a</span></div>');
  });

  it('Should support single node as children inside array', () => {
    const node = cloneVNode(<div />, null, [<span>arr3a</span>]);
    render(node, container);
    expect(container.innerHTML).toBe('<div><span>arr3a</span></div>');
  });

  it('should clone a basic element with null children', () => {
    const node = cloneVNode(<div />, { children: null });
    render(node, container);
    expect(container.innerHTML).toBe('<div></div>');
  });

  it('should clone a basic element with key and ref', () => {
    const ref = () => {};
    const node = cloneVNode(<div />, { key: 'foo', ref });

    expect(node.key).toBe('foo');
    expect(node.ref).toBe(ref);
  });

  it('should clone a basic element with different children and props', () => {
    const node1 = <div>Hello world</div>;
    render(node1, container);
    expect(container.innerHTML).toBe('<div>Hello world</div>');

    const node2 = cloneVNode(node1, null, 'Hello world 2!');
    render(node2, container);
    expect(container.innerHTML).toBe('<div>Hello world 2!</div>');

    const node3 = cloneVNode(node2, { className: 'foo' }, 'Hello world 2!');
    render(node3, container);
    expect(container.innerHTML).toBe('<div class="foo">Hello world 2!</div>');

    const node4 = cloneVNode(node1, { className: 'foo' }, 'Hello world 3!');
    render(node4, container);
    expect(container.innerHTML).toBe('<div class="foo">Hello world 3!</div>');
  });

  function StatelessComponent(props) {
    return <div {...props} />;
  }

  it('should clone a basic stateless component with different children and props', () => {
    const node1 = <StatelessComponent children="Hello world" />;

    render(node1, container);
    expect(container.innerHTML).toBe('<div>Hello world</div>');
    const node2 = cloneVNode(node1, { children: 'Hello world 2!' });

    render(node2, container);
    expect(container.innerHTML).toBe('<div>Hello world 2!</div>');
    const node3 = cloneVNode(node1, {
      children: 'Hello world 3!',
      className: 'yo',
    });

    render(node3, container);
    expect(container.innerHTML).toBe('<div class="yo">Hello world 3!</div>');
  });

  it('Should prefer falsy children (undefined) if its provided over existing children', () => {
    const node1 = <div>1</div>;
    const clone = cloneVNode(node1, null, [undefined]);

    render(clone, container);

    expect(container.innerHTML).toEqual('<div></div>');
  });

  it('Should clone Component with vNode div children', () => {
    class Com extends Component<{ children?: InfernoNode }> {
      public render({ children }) {
        return children;
      }
    }
    const com1 = (
      <Com>
        <div>abc</div>
      </Com>
    );
    const clone = cloneVNode(com1);

    render(clone, container);

    expect(container.innerHTML).toEqual('<div>abc</div>');
  });

  it('Should clone Component with no props at all', () => {
    class Com extends Component<{ children?: InfernoNode }> {
      public render({ children }) {
        return children;
      }
    }
    const com1 = <Com />;
    const clone = cloneVNode(com1);

    render(clone, container);

    expect(container.innerHTML).toEqual('');
  });

  it('Should clone vNode with no props at all', () => {
    const span = <span />;
    const clone = cloneVNode(span);

    render(clone, container);

    expect(container.innerHTML).toEqual('<span></span>');
  });

  it('Should clone Component with vNode text children', () => {
    class Com extends Component {
      public render() {
        return 'Text';
      }
    }
    const com1 = (
      <Com>
        <div>1</div>
      </Com>
    );
    const clone = cloneVNode(com1);

    render(clone, container);

    expect(container.innerHTML).toEqual('Text');
  });

  it('Should clone textVNode', () => {
    const textNode = createTextVNode('foobar');
    const clone = cloneVNode(textNode);

    render(clone, container);

    expect(container.innerHTML).toEqual('foobar');
  });

  it('Should clone textVnode with new content', () => {
    const textNode = createTextVNode('foobar');
    const clone = cloneVNode(textNode, null, 'foo');

    render(clone, container);

    expect(container.innerHTML).toEqual('foo');
  });

  it('Should prefer children in order', () => {
    function Bar({ children }) {
      return <div>{children}</div>;
    }

    const nodeToClone = <Bar>First</Bar>;

    render(nodeToClone, container);

    expect(container.innerHTML).toBe('<div>First</div>');

    render(cloneVNode(nodeToClone, { children: 'Second' }), container);

    expect(container.innerHTML).toBe('<div>Second</div>');

    render(cloneVNode(nodeToClone, { children: 'Second' }, 'Third'), container);

    expect(container.innerHTML).toBe('<div>Third</div>');

    // @ts-ignore
    render(
      cloneVNode(nodeToClone, { children: 'Second' }, 'Third', 'Fourth'),
      container,
    );

    expect(container.innerHTML).toBe('<div>ThirdFourth</div>');
  });

  it('Should prefer children in order #2', () => {
    function Bar({ children }) {
      return <div>{children}</div>;
    }

    const nodeToClone = <Bar>First</Bar>;

    render(nodeToClone, container);

    expect(container.innerHTML).toBe('<div>First</div>');

    render(cloneVNode(nodeToClone, null), container);

    expect(container.innerHTML).toBe('<div>First</div>');

    render(cloneVNode(nodeToClone, null, null), container);

    expect(container.innerHTML).toBe('<div></div>');
  });

  describe('Cloning className', () => {
    it('Should prefer new props over cloned object', () => {
      const node = <div className="test" />;

      render(node, container);

      expect(container.firstChild.className).toEqual('test');

      const newNode = cloneVNode(node, {
        className: 'foo',
      });

      render(newNode, container);
      // expect(newNode.props.className).toBe(undefined); , This depends on if we are running inferno-compat or not
      // expect(newNode.props.hasOwnProperty('className')).toBe(false);

      expect(container.firstChild.className).toBe('foo');
      expect(container.innerHTML).toEqual('<div class="foo"></div>');
    });

    it('Should remove className if new one is empty', () => {
      const node = <div className="test" />;

      render(node, container);

      expect(container.firstChild.className).toEqual('test');

      const newNode = cloneVNode(node, {
        className: null,
      });

      render(newNode, container);

      expect(container.firstChild.className).toBe('');
      expect(container.innerHTML).toEqual('<div></div>');
    });

    it('Should keep previous className when new props dont have that property at all', () => {
      const node = <div className="test" />;

      render(node, container);

      expect(container.firstChild.className).toEqual('test');

      const newNode = cloneVNode(node, {
        id: 'wow',
      });

      render(newNode, container);

      expect(Object.prototype.hasOwnProperty.call(newNode.props, 'id')).toBe(
        true,
      );
      // expect(newNode.props.className).toBe(undefined);
      // expect(newNode.props.hasOwnProperty('className')).toBe(false);

      expect(container.firstChild.className).toBe('test');
      expect(container.firstChild.getAttribute('id')).toBe('wow');
      expect(container.innerHTML).toEqual('<div class="test" id="wow"></div>');
    });

    it('Should be possible to add props to children', () => {
      function Foobar(props) {
        return <div>{cloneVNode(props.children, { foo: 'bar' })}</div>;
      }

      function ChildCom(props) {
        return <div>{props.foo}</div>;
      }

      render(
        <Foobar>
          <ChildCom foo="init" />
        </Foobar>,
        container,
      );

      expect(container.innerHTML).toEqual('<div><div>bar</div></div>');
    });
  });

  describe('Cloning key', () => {
    it('Should prefer new props over cloned object', () => {
      const node = <div key="test" />;

      expect(node.key).toEqual('test');

      render(node, container);
      expect(container.innerHTML).toEqual('<div></div>');

      const newNode = cloneVNode(node, {
        key: 'foo',
      });

      expect(newNode.key).toEqual('foo');
      expect(newNode.props.ref).toBe(undefined);
      // expect(newNode.props.hasOwnProperty('key')).toBe(false);
      render(newNode, container);
      expect(container.innerHTML).toEqual('<div></div>');
    });

    it('Should remove key if new one is empty', () => {
      const node = <div key="test" />;

      expect(node.key).toEqual('test');

      render(node, container);
      expect(container.innerHTML).toEqual('<div></div>');

      const newNode = cloneVNode(node, {
        key: null,
      });

      expect(newNode.key).toEqual(null);

      render(newNode, container);
      expect(newNode.props.key).toBe(undefined);
      // expect(newNode.props.hasOwnProperty('key')).toBe(false);
      expect(container.innerHTML).toEqual('<div></div>');
    });

    it('Should keep previous key when new props dont have that property at all', () => {
      const node = <div key="test" />;

      expect(node.key).toEqual('test');

      render(node, container);
      expect(container.innerHTML).toEqual('<div></div>');

      const newNode = cloneVNode(node, {
        className: null,
      });

      expect(newNode.key).toEqual('test');
      expect(newNode.props.key).toBe(undefined);
      expect(newNode.props.className).toBe(undefined);
      // expect(newNode.props.hasOwnProperty('key')).toBe(false);
      // expect(newNode.props.hasOwnProperty('className')).toBe(false);
      render(newNode, container);
      expect(container.innerHTML).toEqual('<div></div>');
    });
  });

  describe('Cloning Ref', () => {
    function initialFunc() {}

    it('Should prefer new props over cloned object', () => {
      const node = <div ref={initialFunc} />;

      expect(node.ref).toEqual(initialFunc);

      render(node, container);
      expect(container.innerHTML).toEqual('<div></div>');

      function newFunction() {}

      const newNode = cloneVNode(node, {
        ref: newFunction,
      });

      expect(newNode.ref).toEqual(newFunction);
      // expect(newNode.props.hasOwnProperty('ref')).toBe(false);
      expect(newNode.props.ref).toBe(undefined);
      render(newNode, container);
      expect(container.innerHTML).toEqual('<div></div>');
    });

    it('Should remove ref if new one is empty', () => {
      const node = <div ref={initialFunc} />;

      expect(node.ref).toEqual(initialFunc);

      render(node, container);
      expect(container.innerHTML).toEqual('<div></div>');

      const newNode = cloneVNode(node, {
        ref: null,
      });

      expect(newNode.ref).toEqual(null);
      // expect(newNode.props.hasOwnProperty('ref')).toBe(false);
      expect(newNode.props.ref).toBe(undefined);
      render(newNode, container);
      expect(container.innerHTML).toEqual('<div></div>');
    });

    it('Should keep previous ref when new props dont have that property at all', () => {
      const node = <div ref={initialFunc} />;

      expect(node.ref).toEqual(initialFunc);

      render(node, container);
      expect(container.innerHTML).toEqual('<div></div>');

      const newNode = cloneVNode(node, {
        className: null,
      });

      expect(newNode.ref).toEqual(initialFunc);
      // expect(newNode.props.hasOwnProperty('className')).toBe(false);
      expect(newNode.props.className).toBe(undefined);
      expect(newNode.className).toBe(null);
      render(newNode, container);
      expect(container.innerHTML).toEqual('<div></div>');
    });
  });

  describe('without children specified', () => {
    it('should render children one level deep', () => {
      interface NameContainerProps {
        children: InfernoSingleNode[];
      }
      class NameContainer extends Component<NameContainerProps> {
        public render() {
          const children = this.props.children.map((c) =>
            cloneVNode(c as VNode, {
              name: 'Henry',
            }),
          );

          return <span>{children}</span>;
        }
      }

      const NameViewer = () => {
        return (
          <NameContainer>
            <div className="test">
              <span>A child that should render after the clone</span>
            </div>
            <div>
              <span>A child that should render after the clone</span>
            </div>
          </NameContainer>
        );
      };

      render(<NameViewer />, container);

      expect(container.innerHTML)
        .toBe(`<span><div class="test" name="Henry"><span>A child that should render after \
the clone</span></div><div name="Henry"><span>A child that should render after the clone</span></div></span>`);
    });

    it('should render children two levels deep', () => {
      const items = [
        { name: 'Mike Brady' },
        { name: 'Carol Brady' },
        { name: 'Greg Brady' },
        { name: 'Marcia Brady' },
      ];
      const items2 = [{ age: 28 }, { age: 26 }, { age: 16 }, { age: 15 }];

      interface Wrapper1Props {
        children: InfernoSingleNode;
      }

      class Wrapper1 extends Component<Wrapper1Props> {
        public render() {
          const children = cloneVNode(this.props.children as VNode, { items });
          return <div className="wrapper1">{children}</div>;
        }
      }

      interface Wrapper2Props {
        items2: Array<{ age: number }>;
        items: Array<{ name: string }>;
        children: NormalItem[];
      }

      class Wrapper2 extends Component<Wrapper2Props> {
        public render() {
          const children = this.props.children.map((c) => {
            return cloneVNode(c as any, {
              age:
                (c.props && c.props.index) != null
                  ? this.props.items2[c.props.index as number].age
                  : 'default-age',
              name:
                (c.props && c.props.index) != null
                  ? this.props.items[c.props.index as number].name
                  : 'default-name',
              propsIndex: c.props && c.props.index,
            });
          });

          return <div className="wrapper2">{children}</div>;
        }
      }

      interface ItemProps {
        index?: number;
        name?: string;
        age?: string;
      }

      class Item extends Component<ItemProps> {
        public render() {
          return (
            <span>
              item {this.props.name} - age: {this.props.age}
            </span>
          );
        }
      }

      interface NormalItemProps {
        index?: number;
        name?: string;
        age?: string;
      }
      class NormalItem extends Component<NormalItemProps> {
        public render() {
          return (
            <span>
              Normal Item {this.props.name} - age: {this.props.age}
            </span>
          );
        }
      }

      class App extends Component {
        public render() {
          const content: NormalItem[] = [<NormalItem />, <NormalItem />];

          for (const _d of items) {
            const idx = items.indexOf(_d);
            content.push(<Item index={idx} />);
          }

          return (
            <Wrapper1>
              <Wrapper2 items={[]} items2={items2}>
                {content}
              </Wrapper2>
            </Wrapper1>
          );
        }
      }

      render(<App />, container);

      expect(container.innerHTML)
        .toBe(`<div class="wrapper1"><div class="wrapper2"><span>Normal Item default-name \
- age: default-age</span><span>Normal Item default-name - age: default-age</span><span>item Mike Brady - age: \
28</span><span>item Carol Brady - age: 26</span><span>item Greg Brady - age: 16</span><span>item Marcia Brady \
- age: 15</span></div></div>`);
    });
  });

  it('Should not clone all children of Component', () => {
    // React fiddle of cloneElement https://jsfiddle.net/5wh3cfn0/
    class Hello extends Component<{ name?: string }> {
      public render() {
        return <div>Hello {this.props.name}</div>;
      }
    }

    const node1 = (
      <Hello>
        <span>1</span>
      </Hello>
    );
    const cloned1 = cloneVNode(node1);

    expect(node1.props.children).toBe(cloned1.props.children);
    expect(node1).not.toBe(cloned1);
    expect(node1.props).not.toBe(cloned1.props);

    const node = (
      <div>{[null, <div>1</div>, [<div>1</div>, <div>2</div>]]}</div>
    );
    const cloned = cloneVNode(node);

    // Following assertion depends on if Inferno-compat is used or not
    // expect(node.props.children).toBe(cloned.props.children);
    expect(node).not.toBe(cloned);
    expect(node.props).not.toBe(cloned.props);
  });

  it('Should be possible to clone fragment', () => {
    const frag = (
      <Fragment>
        <span>1</span>
        <span>2</span>
      </Fragment>
    );

    render(cloneVNode(frag), container);

    expect(container.innerHTML).toBe('<span>1</span><span>2</span>');

    const firstChild = container.firstChild;

    render(cloneVNode(frag), container);

    expect(firstChild).toBe(container.firstChild);

    expect(container.innerHTML).toBe('<span>1</span><span>2</span>');
  });
});
