import { useRef } from 'react';
import raf from 'rc-util/lib/raf';
import isFF from '../utils/isFirefox';
import useOriginScroll from './useOriginScroll';

interface FireFoxDOMMouseScrollEvent {
  detail: number;
  preventDefault: VoidFunction;
}

/**
 * 做了一些是否到达顶部和底部的判断，同时在下一帧中调用 onWheelDelta
 */
export default function useFrameWheel(
  inVirtual: boolean,
  isScrollAtTop: boolean,
  isScrollAtBottom: boolean,
  horizontalScroll: boolean,
  /***
   * Return `true` when you need to prevent default event
   */
  onWheelDelta: (offset: number, horizontal?: boolean) => void,
): [(e: WheelEvent) => void, (e: FireFoxDOMMouseScrollEvent) => void] {
  const offsetRef = useRef(0);
  const nextFrameRef = useRef<number>(null);

  // Firefox patch
  const wheelValueRef = useRef<number>(null);
  const isMouseScrollRef = useRef<boolean>(false);

  // Scroll status sync
  // 判断是否到顶部或者底部，如果到了就 true
  const originScroll = useOriginScroll(isScrollAtTop, isScrollAtBottom);

  function onWheelY(event: WheelEvent, deltaY: number) {
    raf.cancel(nextFrameRef.current);

    offsetRef.current += deltaY;
    wheelValueRef.current = deltaY;

    // Do nothing when scroll at the edge, Skip check when is in scroll
    if (originScroll(deltaY)) return;

    // Proxy of scroll events
    if (!isFF) {
      event.preventDefault();
    }

    nextFrameRef.current = raf(() => {
      // Patch a multiple for Firefox to fix wheel number too small
      // ref: https://github.com/ant-design/ant-design/issues/26372#issuecomment-679460266
      // firefox 默认 deltaY 是 -1 1 0
      const patchMultiple = isMouseScrollRef.current ? 10 : 1;
      onWheelDelta(offsetRef.current * patchMultiple);
      offsetRef.current = 0;
    });
  }

  function onWheelX(event: WheelEvent, deltaX: number) {
    onWheelDelta(deltaX, true);

    if (!isFF) {
      event.preventDefault();
    }
  }

  // Check for which direction does wheel do. `sx` means `shift + wheel`
  // sx == no scroll ，按住时不进行滚动
  const wheelDirectionRef = useRef<'x' | 'y' | 'sx' | null>(null);
  const wheelDirectionCleanRef = useRef<number>(null);

  function onWheel(event: WheelEvent) {
    console.log(event)
    if (!inVirtual) return;

    // Wait for 2 frame to clean direction
    raf.cancel(wheelDirectionCleanRef.current);
    // 2 个 16ms 之后执行传入函数， 2 frame 就重新检测方向
    wheelDirectionCleanRef.current = raf(() => {
      wheelDirectionRef.current = null;
    }, 2);

    // deltaY mac 向上滚动是正，但视图是想下
    const { deltaX, deltaY, shiftKey } = event;

    let mergedDeltaX = deltaX;
    let mergedDeltaY = deltaY;

    if (
      wheelDirectionRef.current === 'sx' ||
      (!wheelDirectionRef.current && (shiftKey || false) && deltaY && !deltaX)
    ) {
      mergedDeltaX = deltaY;
      mergedDeltaY = 0;

      wheelDirectionRef.current = 'sx';
    }

    const absX = Math.abs(mergedDeltaX);
    const absY = Math.abs(mergedDeltaY);

    if (wheelDirectionRef.current === null) {
      wheelDirectionRef.current = horizontalScroll && absX > absY ? 'x' : 'y';
    }

    if (wheelDirectionRef.current === 'y') {
      onWheelY(event, mergedDeltaY);
    } else {
      onWheelX(event, mergedDeltaX);
    }
  }

  // A patch for firefox
  function onFireFoxScroll(event: FireFoxDOMMouseScrollEvent) {
    if (!inVirtual) return;

    isMouseScrollRef.current = event.detail === wheelValueRef.current;
  }

  return [onWheel, onFireFoxScroll];
}
