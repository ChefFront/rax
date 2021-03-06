/* @jsx createElement */

import createElement from '../createElement';
import Host from '../vdom/host';
import render from '../render';
import ServerDriver from 'driver-server';
import createContext from '../createContext';
import {useState, useContext, useEffect, useLayoutEffect, useRef, useReducer, useImperativeMethods} from '../hooks';
import { flushPassiveEffects } from '../vdom/updater';
import forwardRef from '../forwardRef';
import createRef from '../createRef';
import memo from '../memo';

describe('hooks', () => {
  function createNodeElement(tagName) {
    return {
      nodeType: 1,
      tagName: tagName.toUpperCase(),
      attributes: {},
      style: {},
      childNodes: [],
      parentNode: null
    };
  }

  beforeEach(function() {
    Host.driver = ServerDriver;
    jest.useFakeTimers();
  });

  afterEach(function() {
    Host.driver = null;
    jest.useRealTimers();
  });

  it('works inside a function component with useState', () => {
    const container = createNodeElement('div');

    function App(props) {
      const [value, setValue] = useState(props.value);

      return (
        <span key={value}>{value}</span>
      );
    }

    render(<App value={2} />, container);
    expect(container.childNodes[0].childNodes[0].data).toEqual('2');
  });

  it('lazy state initializer', () => {
    const container = createNodeElement('div');
    let stateUpdater = null;
    function Counter(props) {
      const [count, updateCount] = useState(() => {
        return props.initialState + 1;
      });
      stateUpdater = updateCount;
      return <span>{count}</span>;
    }

    render(<Counter initialState={1} />, container);
    expect(container.childNodes[0].childNodes[0].data).toEqual('2');

    stateUpdater(10);
    expect(container.childNodes[0].childNodes[0].data).toEqual('10');
  });

  it('returns the same updater function every time', () => {
    const container = createNodeElement('div');
    let updaters = [];
    function Counter() {
      const [count, updateCount] = useState(0);
      updaters.push(updateCount);
      return <span>{count}</span>;
    }
    render(<Counter />, container);

    expect(container.childNodes[0].childNodes[0].data).toEqual('0');

    updaters[0](1);

    expect(container.childNodes[0].childNodes[0].data).toEqual('1');

    updaters[0](count => count + 10);

    expect(container.childNodes[0].childNodes[0].data).toEqual('11');

    expect(updaters).toEqual([updaters[0], updaters[0], updaters[0]]);
  });


  it('mount and update a function component with useLayoutEffect', () => {
    const container = createNodeElement('div');

    let renderCounter = 0;
    let effectCounter = 0;
    let cleanupCounter = 0;

    function Counter(props) {
      useLayoutEffect(
        () => {
          ++effectCounter;
          return () => {
            ++cleanupCounter;
          };
        }
      );
      ++renderCounter;
      return <span>{props.count}</span>;
    }

    render(<Counter count={0} />, container);
    expect(effectCounter).toEqual(1);
    expect(renderCounter).toEqual(1);
    expect(cleanupCounter).toEqual(0);

    render(<Counter count={1} />, container);
    expect(renderCounter).toEqual(2);
    expect(effectCounter).toEqual(2);
    expect(cleanupCounter).toEqual(1);

    render(<Counter count={2} />, container);
    expect(renderCounter).toEqual(3);
    expect(effectCounter).toEqual(3);
    expect(cleanupCounter).toEqual(2);
  });

  it('mount and update a function component with useLayout and useLayoutEffect', () => {
    const container = createNodeElement('div');

    let logs = [];

    function Counter(props) {
      useEffect(
        () => {
          logs.push('create1');
          return () => {
            logs.push('destory1');
          };
        }
      );

      useLayoutEffect(
        () => {
          logs.push('create2');
          return () => {
            logs.push('destory2');
          };
        }
      );
      logs.push('render');
      return <span>{props.count}</span>;
    }

    render(<Counter count={0} />, container);
    flushPassiveEffects();
    expect(logs).toEqual([
      'render', 'create2', 'create1'
    ]);

    render(<Counter count={1} />, container);
    flushPassiveEffects();
    expect(logs).toEqual([
      'render', 'create2', 'create1',
      'render', 'destory2', 'create2', 'destory1', 'create1']);

    render(<Counter count={2} />, container);
    flushPassiveEffects();
    expect(logs).toEqual([
      'render', 'create2', 'create1',
      'render', 'destory2', 'create2', 'destory1', 'create1',
      'render', 'destory2', 'create2', 'destory1', 'create1']);
  });

  it('mount and update a function component with useEffect', () => {
    const container = createNodeElement('div');

    let renderCounter = 0;
    let effectCounter = 0;
    let cleanupCounter = 0;

    function Counter(props) {
      useEffect(
        () => {
          ++effectCounter;
          return () => {
            ++cleanupCounter;
          };
        }
      );
      ++renderCounter;
      return <span>{props.count}</span>;
    }

    render(<Counter count={0} />, container);
    flushPassiveEffects();
    expect(effectCounter).toEqual(1);
    expect(renderCounter).toEqual(1);
    expect(cleanupCounter).toEqual(0);

    render(<Counter count={1} />, container);
    flushPassiveEffects();
    expect(renderCounter).toEqual(2);
    expect(effectCounter).toEqual(2);
    expect(cleanupCounter).toEqual(1);

    render(<Counter count={2} />, container);
    flushPassiveEffects();
    expect(renderCounter).toEqual(3);
    expect(effectCounter).toEqual(3);
    expect(cleanupCounter).toEqual(2);
  });

  it('only update if the inputs has changed with useLayoutEffect', () => {
    const container = createNodeElement('div');

    let renderCounter = 0;
    let effectCounter = 0;
    let cleanupCounter = 0;

    function Counter(props) {
      const [text, udpateText] = useState('foo');
      useLayoutEffect(
        () => {
          ++effectCounter;
          udpateText('bar');
          return () => {
            ++cleanupCounter;
          };
        },
        [props.count]
      );
      ++renderCounter;
      return <span>{text}</span>;
    }

    render(<Counter count={0} />, container);
    expect(effectCounter).toEqual(1);
    expect(renderCounter).toEqual(2);
    expect(cleanupCounter).toEqual(0);

    render(<Counter count={0} />, container);
    expect(effectCounter).toEqual(1);
    expect(renderCounter).toEqual(3);
    expect(cleanupCounter).toEqual(0);

    render(<Counter count={1} />, container);
    expect(effectCounter).toEqual(2);
    expect(renderCounter).toEqual(4);
    expect(cleanupCounter).toEqual(1);
  });

  it('only update if the inputs has changed with useEffect', () => {
    const container = createNodeElement('div');

    let renderCounter = 0;
    let effectCounter = 0;
    let cleanupCounter = 0;

    function Counter(props) {
      const [text, udpateText] = useState('foo');
      useEffect(
        () => {
          ++effectCounter;
          udpateText('bar');
          return () => {
            ++cleanupCounter;
          };
        },
        [props.count]
      );
      ++renderCounter;
      return <span>{text}</span>;
    }

    render(<Counter count={0} />, container);
    flushPassiveEffects();
    expect(effectCounter).toEqual(1);
    expect(renderCounter).toEqual(2);
    expect(cleanupCounter).toEqual(0);

    render(<Counter count={0} />, container);
    flushPassiveEffects();
    expect(effectCounter).toEqual(1);
    expect(renderCounter).toEqual(3);
    expect(cleanupCounter).toEqual(0);

    render(<Counter count={1} />, container);
    flushPassiveEffects();
    expect(effectCounter).toEqual(2);
    expect(renderCounter).toEqual(4);
    expect(cleanupCounter).toEqual(1);
  });

  it('update when the inputs has changed with useLayoutEffect', () => {
    const container = createNodeElement('div');

    let renderCounter = 0;
    let effectCounter = 0;
    let cleanupCounter = 0;

    function Counter(props) {
      const [count, updateCount] = useState(0);
      useLayoutEffect(
        () => {
          ++effectCounter;
          updateCount(1);
          return () => {
            ++cleanupCounter;
          };
        },
        [count]
      );
      ++renderCounter;
      return <span>{count}</span>;
    }

    render(<Counter />, container);
    expect(effectCounter).toEqual(2);
    expect(renderCounter).toEqual(2);
    expect(cleanupCounter).toEqual(1);
  });

  it('would run only on mount and clean up on unmount with useLayoutEffect', () => {
    const container = createNodeElement('div');

    let renderCounter = 0;
    let effectCounter = 0;
    let cleanupCounter = 0;

    function Counter() {
      const [count, updateCount] = useState(0);
      useLayoutEffect(
        () => {
          ++effectCounter;
          updateCount(count + 1);
          return () => {
            ++cleanupCounter;
          };
        },
        []
      );
      ++renderCounter;
      return <span>{count}</span>;
    }

    render(<Counter />, container);
    expect(effectCounter).toEqual(1);
    expect(renderCounter).toEqual(2);
    expect(cleanupCounter).toEqual(0);
  });

  it('works inside a function component with useContext', () => {
    const container = createNodeElement('div');
    const Context = createContext(1);

    function Consumer(props) {
      const value = useContext(Context);

      return (
        <span>{value}</span>
      );
    }

    function App(props) {
      return (
        <Context.Provider value={props.value}>
          <Consumer />
        </Context.Provider>
      );
    }

    render(<App value={2} />, container);
    expect(container.childNodes[0].childNodes[0].data).toEqual('2');

    // Update
    render(<App value={3} />, container);
    expect(container.childNodes[0].childNodes[0].data).toEqual('3');
  });

  it('should return the same ref during re-renders', () => {
    const container = createNodeElement('div');
    let renderCounter = 0;
    function Counter() {
      const ref = useRef('val');
      const [firstRef] = useState(ref);

      if (firstRef !== ref) {
        throw new Error('should never change');
      }
      renderCounter++;
      return <span>{ref.current}</span>;
    }

    render(<Counter />, container);
    expect(container.childNodes[0].childNodes[0].data).toEqual('val');
    expect(renderCounter).toEqual(1);

    render(<Counter foo="bar" />, container);
    expect(renderCounter).toEqual(2);
    expect(container.childNodes[0].childNodes[0].data).toEqual('val');
  });

  describe('updates during the render phase', () => {
    it('restarts the render function and applies the new updates on top', () => {
      const container = createNodeElement('div');
      function ScrollView({row: newRow}) {
        let [isScrollingDown, setIsScrollingDown] = useState(false);
        let [row, setRow] = useState(null);

        if (row !== newRow) {
          // Row changed since last render. Update isScrollingDown.
          setIsScrollingDown(row !== null && newRow > row);
          setRow(newRow);
        }

        return <div>{`Scrolling down: ${isScrollingDown}`}</div>;
      }

      render(<ScrollView row={1} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Scrolling down: false');
      render(<ScrollView row={5} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Scrolling down: true');
      render(<ScrollView row={5} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Scrolling down: true');
      render(<ScrollView row={10} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Scrolling down: true');
      render(<ScrollView row={2} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Scrolling down: false');
      render(<ScrollView row={2} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Scrolling down: false');
    });

    it('updates multiple times within same render function', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Counter({row: newRow}) {
        let [count, setCount] = useState(0);
        if (count < 12) {
          setCount(c => c + 1);
          setCount(c => c + 1);
          setCount(c => c + 1);
        }
        logs.push('Render: ' + count);
        return <span>{count}</span>;
      }

      render(<Counter />, container);
      expect(logs).toEqual([
        // Should increase by three each time
        'Render: 0',
        'Render: 3',
        'Render: 6',
        'Render: 9',
        'Render: 12',
      ]);
      expect(container.childNodes[0].childNodes[0].data).toEqual('12');
    });

    it('throws after too many iterations', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Counter({row: newRow}) {
        let [count, setCount] = useState(0);
        setCount(count + 1);
        logs.push('Render: ' + count);
        return <span>{count}</span>;
      }
      // render(<Counter />, container);
      expect(() => {
        render(<Counter />, container);
        jest.runAllTimers();
      }).toThrowError(
        'Too many re-renders, the number of renders is limited to prevent an infinite loop.'
      );
    });

    it('works with useReducer', () => {
      const container = createNodeElement('div');
      let logs = [];
      function reducer(state, action) {
        return action === 'increment' ? state + 1 : state;
      }
      function Counter({row: newRow}) {
        let [count, dispatch] = useReducer(reducer, 0);
        if (count < 3) {
          dispatch('increment');
        }
        logs.push('Render: ' + count);
        return <span>{count}</span>;
      }

      render(<Counter />, container);
      expect(logs).toEqual([
        'Render: 0',
        'Render: 1',
        'Render: 2',
        'Render: 3',
      ]);
      expect(container.childNodes[0].childNodes[0].data).toEqual('3');
    });

    it('uses reducer passed at time of render, not time of dispatch', () => {
      const container = createNodeElement('div');
      let logs = [];
      // This test is a bit contrived but it demonstrates a subtle edge case.

      // Reducer A increments by 1. Reducer B increments by 10.
      function reducerA(state, action) {
        switch (action) {
          case 'increment':
            return state + 1;
          case 'reset':
            return 0;
        }
      }
      function reducerB(state, action) {
        switch (action) {
          case 'increment':
            return state + 10;
          case 'reset':
            return 0;
        }
      }
      function Counter({row: newRow}, ref) {
        let [reducer, setReducer] = useState(() => reducerA);
        let [count, dispatch] = useReducer(reducer, 0);
        useImperativeMethods(ref, () => ({dispatch}));
        if (count < 20) {
          dispatch('increment');
          // Swap reducers each time we increment
          if (reducer === reducerA) {
            setReducer(() => reducerB);
          } else {
            setReducer(() => reducerA);
          }
        }
        logs.push('Render: ' + count);
        return <span>{count}</span>;
      }
      Counter = forwardRef(Counter);
      const counter = createRef(null);
      render(<Counter ref={counter} />, container);
      expect(logs).toEqual([
        // The count should increase by alternating amounts of 10 and 1
        // until we reach 21.
        'Render: 0',
        'Render: 10',
        'Render: 11',
        'Render: 21',
      ]);
      expect(container.childNodes[0].childNodes[0].data).toEqual('21');
      logs = [];

      // Test that it works on update, too. This time the log is a bit different
      // because we started with reducerB instead of reducerA.
      counter.current.dispatch('reset');
      expect(logs).toEqual([
        'Render: 0',
        'Render: 1',
        'Render: 11',
        'Render: 12',
        'Render: 22',
      ]);
      expect(container.childNodes[0].childNodes[0].data).toEqual('22');
    });
  });

  describe('useReducer', () => {
    it('simple mount and update', () => {
      const container = createNodeElement('div');
      const INCREMENT = 'INCREMENT';
      const DECREMENT = 'DECREMENT';

      function reducer(state, action) {
        switch (action) {
          case 'INCREMENT':
            return state + 1;
          case 'DECREMENT':
            return state - 1;
          default:
            return state;
        }
      }

      function Counter(props, ref) {
        const [count, dispatch] = useReducer(reducer, 0);
        useImperativeMethods(ref, () => ({dispatch}));
        return <span>{count}</span>;
      }
      Counter = forwardRef(Counter);
      const counter = createRef(null);
      render(<Counter ref={counter} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('0');

      counter.current.dispatch(INCREMENT);
      expect(container.childNodes[0].childNodes[0].data).toEqual('1');

      counter.current.dispatch(DECREMENT);
      counter.current.dispatch(DECREMENT);
      counter.current.dispatch(DECREMENT);
      expect(container.childNodes[0].childNodes[0].data).toEqual('-2');

      counter.current.dispatch(DECREMENT);
      counter.current.dispatch(INCREMENT);
      counter.current.dispatch(INCREMENT);
      counter.current.dispatch(INCREMENT);
      counter.current.dispatch(DECREMENT);
      counter.current.dispatch(DECREMENT);
      counter.current.dispatch(DECREMENT);
      counter.current.dispatch(INCREMENT);
      expect(container.childNodes[0].childNodes[0].data).toEqual('-2');
    });

    it('accepts an initial action', () => {
      const container = createNodeElement('div');
      const INCREMENT = 'INCREMENT';
      const DECREMENT = 'DECREMENT';

      function reducer(state, action) {
        switch (action) {
          case 'INITIALIZE':
            return 10;
          case 'INCREMENT':
            return state + 1;
          case 'DECREMENT':
            return state - 1;
          default:
            return state;
        }
      }

      const initialAction = 'INITIALIZE';

      function Counter(props, ref) {
        const [count, dispatch] = useReducer(reducer, 0, initialAction);
        useImperativeMethods(ref, () => ({dispatch}));
        return <span>{count}</span>;
      }
      Counter = forwardRef(Counter);
      const counter = createRef(null);
      render(<Counter ref={counter} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('10');

      counter.current.dispatch(INCREMENT);
      expect(container.childNodes[0].childNodes[0].data).toEqual('11');

      counter.current.dispatch(DECREMENT);
      counter.current.dispatch(DECREMENT);
      counter.current.dispatch(DECREMENT);
      expect(container.childNodes[0].childNodes[0].data).toEqual('8');
    });
  });

  describe('useEffect', () => {
    it('simple mount and update', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Counter(props) {
        useEffect(() => {
          logs.push(`Did commit [${props.count}]`);
        });
        return <span>{props.count}</span>;
      }
      render(<Counter count={0} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('0');
      flushPassiveEffects();
      expect(logs).toEqual(['Did commit [0]']);

      logs = [];
      render(<Counter count={1} />, container);
      expect(container.childNodes[0].childNodes[0].data).toEqual('1');
      // Effects are deferred until after the commit
      flushPassiveEffects();
      expect(logs).toEqual(['Did commit [1]']);
    });


    it('flushes passive effects even with sibling deletions', () => {
      const container = createNodeElement('div');
      let logs = [];
      function LayoutEffect(props) {
        useLayoutEffect(() => {
          logs.push('Layout effect');
        });
        logs.push('Layout');
        return <span>Layout</span>;
      }
      function PassiveEffect(props) {
        useEffect(() => {
          logs.push('Passive effect');
        }, []);
        logs.push('Passive');
        return <span>Passive</span>;
      }
      let passive = <PassiveEffect key="p" />;
      render([<LayoutEffect key="l" />, passive], container);
      expect(logs).toEqual(['Layout', 'Layout effect', 'Passive']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Layout');
      expect(container.childNodes[1].childNodes[0].data).toEqual('Passive');

      logs = [];
      // Destroying the first child shouldn't prevent the passive effect from
      // being executed
      render([passive], container);
      expect(logs).toEqual(['Passive effect']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Passive');

      // (No effects are left to flush.)
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual([]);
    });

    it('flushes passive effects even if siblings schedule an update', () => {
      const container = createNodeElement('div');
      let logs = [];
      function PassiveEffect(props) {
        useEffect(() => {
          logs.push('Passive effect');
        });
        logs.push('Passive');
        return <span>Passive</span>;
      }
      function LayoutEffect(props) {
        let [count, setCount] = useState(0);
        useLayoutEffect(() => {
          // Scheduling work shouldn't interfere with the queued passive effect
          if (count === 0) {
            setCount(1);
          }
          logs.push('Layout effect ' + count);
        });
        logs.push('Layout');
        return <span>Layout</span>;
      }
      render([<PassiveEffect key="p" />, <LayoutEffect key="l" />], container);
      flushPassiveEffects();
      expect(logs).toEqual([
        'Passive',
        'Layout',
        'Layout effect 0',
        'Passive effect',
        'Layout',
        'Layout effect 1',
      ]);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Passive');
      expect(container.childNodes[1].childNodes[0].data).toEqual('Layout');
    });

    it('flushes passive effects even if siblings schedule a new root', () => {
      const container = createNodeElement('div');
      const container2 = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function PassiveEffect(props) {
        useEffect(() => {
          logs.push('Passive effect');
        }, []);
        return <Text text="Passive" />;
      }
      function LayoutEffect(props) {
        useLayoutEffect(() => {
          logs.push('Layout effect');
          // Scheduling work shouldn't interfere with the queued passive effect
          render(<Text text="New Root" />, container2);
        });
        return <Text text="Layout" />;
      }
      render([<PassiveEffect key="p" />, <LayoutEffect key="l" />], container);
      expect(logs).toEqual([
        'Passive',
        'Layout',
        'Layout effect',
        'Passive effect',
        'New Root',
      ]);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Passive');
      expect(container.childNodes[1].childNodes[0].data).toEqual('Layout');
    });

    it(
      'flushes effects serially by flushing old effects before flushing ' +
        "new ones, if they haven't already fired",
      () => {
        const container = createNodeElement('div');
        let logs = [];
        function Text(props) {
          logs.push(props.text);
          return <span>{props.text}</span>;
        }
        function getCommittedText() {
          return container.childNodes[0].childNodes[0].data;
        }

        function Counter(props) {
          useEffect(() => {
            logs.push(
              `Committed state when effect was fired: ${getCommittedText()}`,
            );
          });
          return <Text text={props.count} />;
        }
        render(<Counter count={0} />, container);
        expect(logs).toEqual([0]);
        expect(container.childNodes[0].childNodes[0].data).toEqual('0');

        // Before the effects have a chance to flush, schedule another update
        logs = [];
        render(<Counter count={1} />, container);
        expect(logs).toEqual([
          // The previous effect flushes before the reconciliation
          'Committed state when effect was fired: 0',
          1,
        ]);
        expect(container.childNodes[0].childNodes[0].data).toEqual('1');

        logs = [];
        flushPassiveEffects();
        expect(logs).toEqual([
          'Committed state when effect was fired: 1',
        ]);
      },
    );

    it('updates have async priority', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function Counter(props) {
        const [count, updateCount] = useState('(empty)');
        useEffect(
          () => {
            logs.push(`Schedule update [${props.count}]`);
            updateCount(props.count);
          },
          [props.count],
        );
        return <Text text={'Count: ' + count} />;
      }
      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: (empty)']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: (empty)');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual(['Schedule update [0]', 'Count: 0']);

      logs = [];
      render(<Counter count={1} />, container);
      expect(logs).toEqual(['Count: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual(['Schedule update [1]', 'Count: 1']);
    });

    it('updates have async priority even if effects are flushed early', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function Counter(props) {
        const [count, updateCount] = useState('(empty)');
        useEffect(
          () => {
            logs.push(`Schedule update [${props.count}]`);
            updateCount(props.count);
          },
          [props.count],
        );
        return <Text text={'Count: ' + count} />;
      }
      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: (empty)']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: (empty)');

      logs = [];
      // Rendering again should flush the previous commit's effects
      render(<Counter count={1} />, container);
      expect(logs).toEqual(['Schedule update [0]', 'Count: 0', 'Count: 0']);

      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual(['Schedule update [1]', 'Count: 1']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 1');
    });

    it('flushes serial effects before enqueueing work', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      let _updateCount;
      function Counter(props) {
        const [count, updateCount] = useState(0);
        _updateCount = updateCount;
        useEffect(() => {
          logs.push('Will set count to 1');
          updateCount(1);
        }, []);
        return <Text text={'Count: ' + count} />;
      }

      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');

      logs = [];
      // Enqueuing this update forces the passive effect to be flushed --
      // updateCount(1) happens first, so 2 wins.
      _updateCount(2);
      expect(logs).toEqual(['Will set count to 1', 'Count: 1', 'Count: 2']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 2');
    });

    it(
      'in sync mode, useEffect is deferred and updates finish synchronously ' +
        '(in a single batch)',
      () => {
        const container = createNodeElement('div');
        let logs = [];
        function Counter(props) {
          const [count, updateCount] = useState('(empty)');
          useEffect(
            () => {
              // Update multiple times. These should all be batched together in
              // a single render.
              updateCount(props.count);
              updateCount(props.count);
              updateCount(props.count);
              updateCount(props.count);
              updateCount(props.count);
              updateCount(props.count);
            },
            [props.count],
          );
          logs.push('Count: ' + count);
          return <span>{'Count: ' + count}</span>;
        }
        render(<Counter count={0} />, container);
        // Even in sync mode, effects are deferred until after paint
        expect(logs).toEqual(['Count: (empty)']);
        expect(container.childNodes[0].childNodes[0].data).toEqual('Count: (empty)');
        // Now fire the effects
        logs = [];
        flushPassiveEffects();
        // There were multiple updates, but there should only be a
        // single render
        expect(logs).toEqual(['Count: 0']);
        expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      },
    );

    it(
      'in sync mode, useEffect is deferred and updates finish synchronously ' +
        '(in a single batch with different state)',
      () => {
        const container = createNodeElement('div');
        let logs = [];
        function Counter(props) {
          const [count, updateCount] = useState('(empty)');
          useEffect(
            () => {
              // Update multiple times. These should all be batched together in
              // a single render.
              updateCount(2);
              updateCount(3);
              updateCount(4);
              updateCount(5);
              updateCount(6);
              updateCount(7);
            },
            [props.count],
          );
          logs.push('Count: ' + count);
          return <span>{'Count: ' + count}</span>;
        }
        render(<Counter count={0} />, container);
        // Even in sync mode, effects are deferred until after paint
        expect(logs).toEqual(['Count: (empty)']);
        expect(container.childNodes[0].childNodes[0].data).toEqual('Count: (empty)');
        // Now fire the effects
        logs = [];
        flushPassiveEffects();
        // There were multiple updates, but there should only be a
        // single render
        expect(logs).toEqual(['Count: 7']);
        expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 7');
      },
    );

    it('unmounts previous effect', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function Counter(props) {
        useEffect(() => {
          logs.push(`Did create [${props.count}]`);
          return () => {
            logs.push(`Did destroy [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }
      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual(['Did create [0]']);

      logs = [];
      render(<Counter count={1} />, container);
      expect(logs).toEqual(['Count: 1']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 1');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual([
        'Did destroy [0]',
        'Did create [1]',
      ]);
    });

    it('unmounts on deletion', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function Counter(props) {
        useEffect(() => {
          logs.push(`Did create [${props.count}]`);
          return () => {
            logs.push(`Did destroy [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }
      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual(['Did create [0]']);

      logs = [];
      render(<div />, container);
      // TODO
      flushPassiveEffects();
      expect(logs).toEqual(['Did destroy [0]']);
      // TODO
      expect(container.childNodes[0].tagName).toEqual('DIV');
    });

    it('unmounts on deletion after skipped effect', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function Counter(props) {
        useEffect(() => {
          logs.push(`Did create [${props.count}]`);
          return () => {
            logs.push(`Did destroy [${props.count}]`);
          };
        }, []);
        return <Text text={'Count: ' + props.count} />;
      }
      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual(['Did create [0]']);

      logs = [];
      render(<Counter count={1} />, container);
      expect(logs).toEqual(['Count: 1']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 1');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual([]);

      logs = [];
      render([], container);
      // TODO
      flushPassiveEffects();
      expect(logs).toEqual(['Did destroy [0]']);
      expect(container.childNodes).toEqual([]);
    });

    it('skips effect if constructor has not changed', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function effect() {
        logs.push('Did mount');
        return () => {
          logs.push('Did unmount');
        };
      }
      function Counter(props) {
        useEffect(effect);
        return <Text text={'Count: ' + props.count} />;
      }
      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual(['Did mount']);

      logs = [];
      render(<Counter count={1} />, container);
      // No effect, because constructor was hoisted outside render
      expect(logs).toEqual(['Count: 1']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 1');

      logs = [];
      render([], container);
      // TODO
      flushPassiveEffects();
      expect(logs).toEqual(['Did unmount']);
      expect(container.childNodes).toEqual([]);
    });

    it('multiple effects', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function Counter(props) {
        useEffect(() => {
          logs.push(`Did commit 1 [${props.count}]`);
        });
        useEffect(() => {
          logs.push(`Did commit 2 [${props.count}]`);
        });
        return <Text text={'Count: ' + props.count} />;
      }
      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual([
        'Did commit 1 [0]',
        'Did commit 2 [0]',
      ]);
      logs = [];
      render(<Counter count={1} />, container);
      expect(logs).toEqual(['Count: 1']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 1');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual([
        'Did commit 1 [1]',
        'Did commit 2 [1]',
      ]);
    });

    it('unmounts all previous effects before creating any new ones', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function Counter(props) {
        useEffect(() => {
          logs.push(`Mount A [${props.count}]`);
          return () => {
            logs.push(`Unmount A [${props.count}]`);
          };
        });
        useEffect(() => {
          logs.push(`Mount B [${props.count}]`);
          return () => {
            logs.push(`Unmount B [${props.count}]`);
          };
        });
        return <Text text={'Count: ' + props.count} />;
      }
      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual(['Mount A [0]', 'Mount B [0]']);
      logs = [];
      render(<Counter count={1} />, container);
      expect(logs).toEqual(['Count: 1']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 1');
      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual([
        'Unmount A [0]',
        'Mount A [1]',
        'Unmount B [0]',
        'Mount B [1]',
      ]);
    });

    it('works with memo', () => {
      const container = createNodeElement('div');
      let logs = [];
      function Text(props) {
        logs.push(props.text);
        return <span>{props.text}</span>;
      }
      function Counter({count}) {
        useLayoutEffect(() => {
          logs.push('Mount: ' + count);
          return () => logs.push('Unmount: ' + count);
        });
        return <Text text={'Count: ' + count} />;
      }
      Counter = memo(Counter);

      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Count: 0', 'Mount: 0']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 0');

      logs = [];
      render(<Counter count={1} />, container);
      expect(logs).toEqual(['Count: 1', 'Unmount: 0', 'Mount: 1']);
      expect(container.childNodes[0].childNodes[0].data).toEqual('Count: 1');

      logs = [];
      render([], container);
      // TODO
      flushPassiveEffects();
      expect(logs).toEqual(['Unmount: 1']);
      expect(container.childNodes).toEqual([]);
    });
  });

  describe('useLayoutEffect', () => {
    it('force flushes passive effects before firing new layout effects', () => {
      const container = createNodeElement('div');
      let logs = [];
      let committedText = '(empty)';
      function Counter(props) {
        useLayoutEffect(() => {
          // Normally this would go in a mutation effect, but this test
          // intentionally omits a mutation effect.
          committedText = props.count + '';

          logs.push(`Mount layout [current: ${committedText}]`);
          return () => {
            logs.push(`Unmount layout [current: ${committedText}]`);
          };
        });
        useEffect(() => {
          logs.push(`Mount normal [current: ${committedText}]`);
          return () => {
            logs.push(`Unmount normal [current: ${committedText}]`);
          };
        });
        return null;
      }

      render(<Counter count={0} />, container);
      expect(logs).toEqual(['Mount layout [current: 0]']);
      expect(committedText).toEqual('0');

      logs = [];
      render(<Counter count={1} />, container);
      expect(logs).toEqual([
        'Mount normal [current: 0]',
        'Unmount layout [current: 0]',
        'Mount layout [current: 1]',
      ]);
      expect(committedText).toEqual('1');

      logs = [];
      flushPassiveEffects();
      expect(logs).toEqual([
        'Unmount normal [current: 1]',
        'Mount normal [current: 1]',
      ]);
    });
  });
});
