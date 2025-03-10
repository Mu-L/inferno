import {
  Component,
  createTextVNode,
  createVNode,
  linkEvent,
  render,
} from 'inferno';
import { ChildFlags, VNodeFlags } from 'inferno-vnode-flags';

describe('patching routine', () => {
  let container;

  beforeEach(function () {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(function () {
    render(null, container);
    container.innerHTML = '';
    document.body.removeChild(container);
  });

  it('Should do nothing if lastVNode strictly equals nextVnode', () => {
    const yar = createVNode(
      VNodeFlags.HtmlElement,
      'div',
      null,
      createTextVNode('123'),
      ChildFlags.HasVNodeChildren,
      null,
      null,
      null,
    );
    const bar = createVNode(
      VNodeFlags.HtmlElement,
      'div',
      null,
      createTextVNode('123'),
      ChildFlags.HasVNodeChildren,
      null,
      null,
      null,
    );
    let foo = createVNode(
      VNodeFlags.HtmlElement,
      'div',
      null,
      [bar, yar],
      ChildFlags.HasNonKeyedChildren,
      null,
      null,
      null,
    );

    render(foo, container);
    expect(container.innerHTML).toEqual(
      '<div><div>123</div><div>123</div></div>',
    );

    foo = createVNode(
      VNodeFlags.HtmlElement,
      'div',
      null,
      [bar, yar],
      ChildFlags.HasNonKeyedChildren,
      null,
      null,
      null,
    );

    render(foo, container);
    expect(container.innerHTML).toEqual(
      '<div><div>123</div><div>123</div></div>',
    );
  });

  it('Should mount nextNode if lastNode crashed', () => {
    const validNode = createVNode(
      VNodeFlags.HtmlElement,
      'span',
      null,
      createTextVNode('a'),
      ChildFlags.HasVNodeChildren,
      null,
      null,
      null,
    );
    const invalidNode = createVNode(0, 'span');

    render(validNode, container);
    try {
      render(invalidNode, container);
    } catch (e) {
      expect(
        e.message.includes('Inferno Error: mount() received an object'),
      ).toBeTruthy();
    }
    expect(container.innerHTML).toEqual('<span>a</span>');

    render(validNode, container);
    expect(container.innerHTML).toEqual('<span>a</span>');
  });

  it('Should not access real DOM property when text does not change', () => {
    render(createTextVNode('a'), container);
    expect(container.innerHTML).toEqual('a');
    render(createTextVNode('a'), container);
    expect(container.innerHTML).toEqual('a');
  });

  it('Should not patch same innerHTML', () => {
    container.innerHTML = '<span><span><span>child</span></span></span>';

    const childelem = container.firstElementChild.firstElementChild;
    const props = { dangerouslySetInnerHTML: { __html: '<span>child</span>' } };

    const bar = createVNode(
      VNodeFlags.HtmlElement,
      'span',
      null,
      null,
      ChildFlags.HasInvalidChildren,
      props,
      null,
      null,
    );
    const foo = createVNode(
      VNodeFlags.HtmlElement,
      'span',
      null,
      [bar],
      ChildFlags.HasNonKeyedChildren,
      null,
      null,
      null,
    );

    render(foo, container);

    expect(childelem).toBe(container.firstElementChild.firstElementChild);
  });

  it('Should always unmount/mount if ReCreate flag is set', () => {
    const spyObj = { fn: () => {} };
    const spyObj2 = { fn: () => {} };
    const spy1 = spyOn(spyObj, 'fn');
    const spy2 = spyOn(spyObj2, 'fn');

    const div = createVNode(
      VNodeFlags.HtmlElement | VNodeFlags.ReCreate,
      'div',
      null,
      createTextVNode('1'),
      ChildFlags.HasVNodeChildren,
      null,
      null,
      spy1,
    );

    render(div, container);

    const firstDiv = container.firstChild;

    expect(container.innerHTML).toEqual('<div>1</div>');
    expect(spy1.calls.count()).toBe(1);
    expect(spy1.calls.argsFor(0).length).toBe(1);
    expect(spy1.calls.argsFor(0)[0]).toEqual(firstDiv);

    const div2 = createVNode(
      VNodeFlags.HtmlElement | VNodeFlags.ReCreate,
      'div',
      null,
      createTextVNode('1'),
      ChildFlags.HasVNodeChildren,
      null,
      null,
      spy2,
    );

    render(div2, container);

    expect(firstDiv).not.toBe(container.firstChild); // Div is different

    // Html is the same
    expect(container.innerHTML).toEqual('<div>1</div>');

    // Verify all callbacks were called
    expect(spy1.calls.count()).toBe(2);
    expect(spy1.calls.argsFor(1).length).toBe(1);
    expect(spy1.calls.argsFor(1)[0]).toEqual(null);

    expect(spy2.calls.count()).toBe(1);
    expect(spy2.calls.argsFor(0).length).toBe(1);
    expect(spy2.calls.argsFor(0)[0]).toEqual(container.firstChild);
  });

  it('Should not mutate previous children', () => {
    let callCount = 0;

    class Collapsible extends Component {
      public render() {
        return (
          <div>
            <button
              onClick={() => {
                callCount++;
                this.setState({});
              }}
            >
              Click twice !
            </button>
            {this.props.children}
          </div>
        );
      }
    }

    class Clock extends Component {
      public render() {
        return (
          <Collapsible>
            <div>
              {[<p>Hello 0</p>, <p>Hello 1</p>]}
              <strong>Hello 2</strong>
            </div>
            <p>Hello 3</p>
          </Collapsible>
        );
      }
    }

    const expectedDOM =
      '<div><button>Click twice !</button><div><p>Hello 0</p><p>Hello 1</p><strong>Hello 2</strong></div><p>Hello 3</p></div>';

    render(<Clock />, container);

    expect(container.innerHTML).toBe(expectedDOM);

    const btn = container.querySelector('button');

    btn.click();

    expect(callCount).toBe(1);

    expect(container.innerHTML).toBe(expectedDOM);

    btn.click();

    expect(callCount).toBe(2);

    expect(container.innerHTML).toBe(expectedDOM);

    btn.click();

    expect(callCount).toBe(3);

    expect(container.innerHTML).toBe(expectedDOM);

    btn.click();

    expect(callCount).toBe(4);

    expect(container.innerHTML).toBe(expectedDOM);
  });

  it('Should not re-mount hoisted vNode', () => {
    const Com1 = () => <div>1</div>;
    const Com2 = () => <div>2</div>;

    const div = (
      <div>
        <Com1 />
        <Com2 />
      </div>
    );

    function Comp() {
      return div;
    }

    render(<Comp />, container);

    expect(container.innerHTML).toBe('<div><div>1</div><div>2</div></div>');

    const first = container.firstChild.childNodes[0];
    const second = container.firstChild.childNodes[1];

    render(<Comp />, container);

    expect(container.innerHTML).toBe('<div><div>1</div><div>2</div></div>');

    const first2 = container.firstChild.childNodes[0];
    const second2 = container.firstChild.childNodes[1];

    // Verify dom nodes did not change
    expect(first).toBe(first2);
    expect(second).toBe(second2);

    render(<Comp />, container);

    expect(container.innerHTML).toBe('<div><div>1</div><div>2</div></div>');

    const first3 = container.firstChild.childNodes[0];
    const second3 = container.firstChild.childNodes[1];

    // Verify dom nodes did not change
    expect(first).toBe(first3);
    expect(second).toBe(second3);
  });

  describe('Event changes', () => {
    describe('Synthetic', () => {
      it('Should remove function if next is boolean (false)', () => {
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onClick={linkObj.methodFn} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        render(<div onClick={false as any} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        // ADD BACK

        render(<div onclick={linkObj.methodFn} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(2);
      });

      it('Should remove function if next is boolean (true)', () => {
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onClick={linkObj.methodFn} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        render(<div onClick={true as any} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        // ADD BACK

        render(<div onclick={linkObj.methodFn} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(2);
      });

      it('Should remove linkEvent if next is boolean (false)', () => {
        const data = { foo: 1 };
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onClick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        render(<div onClick={false as any} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        // ADD BACK

        render(<div onClick={linkEvent(data, linkObj.methodFn)} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(2);
      });

      it('Should remove linkEvent if next is boolean (true)', () => {
        const data = { foo: 1 };
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onClick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        render(<div onClick={true as any} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        // ADD BACK

        render(<div onClick={linkEvent(data, linkObj.methodFn)} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(2);
      });

      it('Should change from LinkEvent to Function', () => {
        const data = { foo: 1 };
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onClick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        const anotherObj = {
          anotherFn() {},
        };
        spyOn(anotherObj, 'anotherFn');

        render(<div onClick={anotherObj.anotherFn} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);
        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
      });

      it('Should change from Function to LinkEvent', () => {
        const anotherObj = {
          anotherFn() {},
        };
        spyOn(anotherObj, 'anotherFn');

        render(<div onClick={anotherObj.anotherFn} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);

        const data = { foo: 1 };
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onClick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);
      });

      it('Should change from Function to different Function', () => {
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onClick={linkObj.methodFn} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        const anotherObj = {
          anotherFn() {},
        };
        spyOn(anotherObj, 'anotherFn');

        render(<div onClick={anotherObj.anotherFn} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);
        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
      });

      it('Should change from LinkEvent fn to different LinkEvent fn', () => {
        const data = { foo: 1 };
        const anotherObj = {
          anotherFn() {},
        };
        spyOn(anotherObj, 'anotherFn');

        render(
          <div onClick={linkEvent(data, anotherObj.anotherFn)} />,
          container,
        );

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);

        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onClick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);
      });

      it('Should change from LinkEvent data to different LinkEvent data', () => {
        const obj1 = { foo: 1 };
        const obj2 = { foo: 2 };
        let secondArg = null;

        const anotherObj = {
          anotherFn(_, ev) {
            secondArg = ev;
          },
        };

        const anotherFnSpy = spyOn(anotherObj, 'anotherFn').and.callThrough();

        render(<div onClick={linkEvent(obj1, anotherFnSpy)} />, container);

        expect(anotherFnSpy).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherFnSpy).toHaveBeenCalledTimes(1);
        expect(anotherFnSpy).toHaveBeenCalledWith(obj1, secondArg);

        anotherFnSpy.calls.reset();

        render(<div onClick={linkEvent(obj2, anotherFnSpy)} />, container);

        expect(anotherFnSpy).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherFnSpy).toHaveBeenCalledTimes(1);
        expect(anotherFnSpy).toHaveBeenCalledWith(obj2, secondArg);
      });
    });

    describe('Regular', () => {
      it('Should remove function if next is boolean (false)', () => {
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onclick={linkObj.methodFn} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        render(<div onclick={false as any} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        // ADD BACK

        render(<div onclick={linkObj.methodFn} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(2);
      });

      it('Should remove function if next is boolean (true)', () => {
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onclick={linkObj.methodFn} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        render(<div onclick={true as any} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        // ADD BACK

        render(<div onclick={linkObj.methodFn} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(2);
      });

      it('Should remove linkEvent if next is boolean (false)', () => {
        const data = { foo: 1 };
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onclick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        render(<div onclick={false as any} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        // ADD BACK

        render(<div onclick={linkEvent(data, linkObj.methodFn)} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(2);
      });

      it('Should remove linkEvent if next is boolean (true)', () => {
        const data = { foo: 1 };
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onclick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        render(<div onclick={true as any} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        // ADD BACK

        render(<div onclick={linkEvent(data, linkObj.methodFn)} />, container);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(2);
      });

      it('Should change from LinkEvent to Function', () => {
        const data = { foo: 1 };
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onclick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        const anotherObj = {
          anotherFn() {},
        };
        spyOn(anotherObj, 'anotherFn');

        render(<div onclick={anotherObj.anotherFn} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);
        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
      });

      it('Should change from Function to LinkEvent', () => {
        const anotherObj = {
          anotherFn() {},
        };
        spyOn(anotherObj, 'anotherFn');

        render(<div onclick={anotherObj.anotherFn} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);

        const data = { foo: 1 };
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onclick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);
      });

      it('Should change from Function to different Function', () => {
        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onclick={linkObj.methodFn} />, container);

        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);

        const anotherObj = {
          anotherFn() {},
        };
        spyOn(anotherObj, 'anotherFn');

        render(<div onclick={anotherObj.anotherFn} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);
        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
      });

      it('Should change from LinkEvent fn to different LinkEvent fn', () => {
        const data = { foo: 1 };
        const anotherObj = {
          anotherFn() {},
        };
        spyOn(anotherObj, 'anotherFn');

        render(
          <div onclick={linkEvent(data, anotherObj.anotherFn)} />,
          container,
        );

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);

        const linkObj = {
          methodFn() {},
        };
        spyOn(linkObj, 'methodFn');

        render(<div onclick={linkEvent(data, linkObj.methodFn)} />, container);

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
        expect(linkObj.methodFn).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherObj.anotherFn).toHaveBeenCalledTimes(1);
        expect(linkObj.methodFn).toHaveBeenCalledTimes(1);
      });

      it('Should change from LinkEvent data to different LinkEvent data', () => {
        const obj1 = { foo: 1 };
        const obj2 = { foo: 2 };
        let secondArg = null;

        const anotherObj = {
          anotherFn(_, ev) {
            secondArg = ev;
          },
        };

        const anotherFnSpy = spyOn(anotherObj, 'anotherFn').and.callThrough();

        render(<div onclick={linkEvent(obj1, anotherFnSpy)} />, container);

        expect(anotherFnSpy).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherFnSpy).toHaveBeenCalledTimes(1);
        expect(anotherFnSpy).toHaveBeenCalledWith(obj1, secondArg);

        anotherFnSpy.calls.reset();

        render(<div onclick={linkEvent(obj2, anotherFnSpy)} />, container);

        expect(anotherFnSpy).toHaveBeenCalledTimes(0);

        container.firstChild.click();

        expect(anotherFnSpy).toHaveBeenCalledTimes(1);
        expect(anotherFnSpy).toHaveBeenCalledWith(obj2, secondArg);
      });
    });
  });
});
