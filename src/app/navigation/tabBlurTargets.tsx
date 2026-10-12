import { createContext, type ReactNode, type RefObject, useContext, useLayoutEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import { BlurTargetView } from 'expo-blur';

/**
 * Android blur needs an explicit BlurTargetView to sample from, and the BlurView
 * must not live inside it. Each tab scene is wrapped in its own target (via the
 * navigator's `screenLayout`), and FloatingTabBar — a sibling of the scenes —
 * blurs whichever target belongs to the focused route.
 */
type Registry = {
    targets: Map<string, RefObject<View | null>>;
    listeners: Set<() => void>;
};

const TabBlurTargetsContext = createContext<Registry | null>(null);

export function TabBlurTargetsProvider({ children }: { children: ReactNode }) {
    const registry = useRef<Registry>({ targets: new Map(), listeners: new Set() }).current;
    return <TabBlurTargetsContext.Provider value={registry}>{children}</TabBlurTargetsContext.Provider>;
}

export function TabBlurTarget({ routeKey, backgroundColor, children }: {
    routeKey: string;
    backgroundColor: string;
    children: ReactNode;
}) {
    const registry = useContext(TabBlurTargetsContext);
    const ref = useRef<View>(null);

    useLayoutEffect(() => {
        if (!registry) return;
        registry.targets.set(routeKey, ref);
        registry.listeners.forEach((l) => l());
        return () => {
            registry.targets.delete(routeKey);
            registry.listeners.forEach((l) => l());
        };
    }, [registry, routeKey]);

    return (
        <BlurTargetView ref={ref} collapsable={false} style={{ flex: 1, backgroundColor }}>
            {children}
        </BlurTargetView>
    );
}

/** Ref to the focused tab's BlurTargetView, or undefined until it has mounted. */
export function useTabBlurTarget(routeKey: string): RefObject<View | null> | undefined {
    const registry = useContext(TabBlurTargetsContext);
    const [, setVersion] = useState(0);

    useLayoutEffect(() => {
        if (!registry) return;
        const listener = () => setVersion((v) => v + 1);
        registry.listeners.add(listener);
        return () => {
            registry.listeners.delete(listener);
        };
    }, [registry]);

    return registry?.targets.get(routeKey);
}
