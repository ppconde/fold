import { useEffect } from 'react';

const useEventListener = (
    eventType: string,
    callback: (event: Event) => void,
    target = window
): void => {
    useEffect(() => {
        const eventListener = (event: Event) => callback(event);

        target.addEventListener(eventType, eventListener);

        return () => {
            target.removeEventListener(eventType, eventListener);
        };
    }, [eventType, callback, target]);
};

export default useEventListener;
