import {
    createContext,
    useContext,
    useCallback,
    useState,
    useEffect,
    useRef,
    useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaCheck,
    FaExclamation,
    FaInfo,
    FaExclamationTriangle,
    FaTimes,
} from "react-icons/fa";

import { Icon } from "./Icon";

// Type of toast available
const toast_type = {
    info: {
        icon: FaInfo,
        borderColor: "border-blue-100",
        pillBg: "bg-blue-50/60",
        pillBorder: "border-blue-100/80",
        iconCircleBg: "bg-blue-400",
        iconColor: "text-blue-500",
        textColor: "text-slate-700",
        progressTrackBg: "#f0f7ff",
        progressFill: "#60a5fa",
        role: "status",
    },
    success: {
        icon: FaCheck,
        borderColor: "border-emerald-100",
        pillBg: "bg-emerald-50/60",
        pillBorder: "border-emerald-100/80",
        iconCircleBg: "bg-emerald-400",
        iconColor: "text-green-500",
        textColor: "text-slate-700",
        progressTrackBg: "#f0fdf4",
        progressFill: "#34d399",
        role: "status",
    },
    error: {
        icon: FaExclamation,
        borderColor: "border-rose-100",
        pillBg: "bg-rose-50/60",
        pillBorder: "border-rose-100/80",
        iconCircleBg: "bg-rose-400",
        iconColor: "text-red-500",
        textColor: "text-slate-700",
        progressTrackBg: "#fff1f2",
        progressFill: "#fb7185",
        role: "alert",
    },
    warning: {
        icon: FaExclamationTriangle,
        borderColor: "border-amber-100",
        pillBg: "bg-amber-50/60",
        pillBorder: "border-amber-100/80",
        iconCircleBg: "bg-amber-400",
        iconColor: "text-yellow-500",
        textColor: "text-slate-700",
        progressTrackBg: "#fffbeb",
        progressFill: "#fbbf24",
        role: "alert",
    },
};

// 🌟 全局 Keyframes 样式注入组件
const ProgressKeyframes = () => (
    <style>{`
        @keyframes toastProgressShrink {
            from { width: 100%; }
            to { width: 0%; }
        }
    `}</style>
);

/**
 * 💡 自定义 Hook：管理可暂停、可固定的倒计时逻辑
 */
const usePauseableTimer = ({ duration, isPaused, isPinned, onExpire }) => {
    const remainingTimeRef = useRef(duration);
    const startTimeRef = useRef(Date.now());
    const timerRef = useRef(null);
    const onExpireRef = useRef(onExpire);

    // 随时保持最新的回调函数引用，避免闭包陷阱
    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
        if (!duration || duration <= 0 || isPinned) return;

        if (isPaused) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            const elapsed = Date.now() - startTimeRef.current;
            remainingTimeRef.current = Math.max(
                0,
                remainingTimeRef.current - elapsed,
            );
        } else {
            if (remainingTimeRef.current <= 0) return;

            startTimeRef.current = Date.now();
            timerRef.current = setTimeout(() => {
                onExpireRef.current?.();
            }, remainingTimeRef.current);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [duration, isPaused, isPinned]);
};

/**
 * ✅ 2. 单个 Toast 项组件
 */
export const Toast = ({ message, type, duration, onClose }) => {
    const config = toast_type[type];
    const ToastIcon = config.icon;

    const [isHovered, setIsHovered] = useState(false);
    const [isPinned, setIsPinned] = useState(false);

    // 使用抽离后的倒计时 Hook
    usePauseableTimer({
        duration,
        isPaused: isHovered,
        isPinned,
        onExpire: onClose,
    });

    // 点击固定逻辑
    const handlePin = useCallback(() => {
        setIsPinned(true);
    }, []);

    // 支持键盘 Enter / Space 操作 (a11y)
    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePin();
            }
        },
        [handlePin],
    );

    return (
        <motion.div
            role={config.role}
            aria-live={config.role === "alert" ? "assertive" : "polite"}
            tabIndex={0}
            layout="position"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{
                type: "spring",
                stiffness: 150,
                damping: 28,
                mass: 0.8,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handlePin}
            onKeyDown={handleKeyDown}
            className={`
                relative w-full max-w-sm overflow-hidden 
                rounded-[22px] bg-white 
                border ${config.borderColor} 
                shadow-md shadow-slate-100/80
                pointer-events-auto cursor-pointer select-none
                focus:outline-none focus:ring-2 focus:ring-slate-300
                transition-shadow duration-200
                ${isPinned ? "ring-2 ring-slate-200/80 shadow-lg" : ""}
            `}
        >
            {/* 卡片内容区 */}
            <div className="flex items-center gap-3.5 px-4 py-3">
                {/* 胶囊状图标衬底 */}
                <div className="flex-shrink-0">
                    <div
                        className={`
                        w-6 h-6 rounded-full p-1
                        flex items-center justify-center
                        ${config.iconCircleBg} bg-opacity-20
                    `}
                    >
                        <ToastIcon className={`w-4 h-4 ${config.iconColor}`} />
                    </div>
                </div>

                {/* 消息文本 */}
                <div className="flex-1 min-w-0">
                    <p
                        className={`text-sm font-semibold ${config.textColor} leading-snug`}
                    >
                        {message}
                    </p>
                </div>

                {/* 关闭按钮 */}
                <button
                    type="button"
                    aria-label="Close notification"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-300"
                >
                    <Icon icon={FaTimes} className="w-4 h-4" />
                </button>
            </div>

            {/* 倒计时进度条 */}
            {duration > 0 && !isPinned && (
                <div
                    className="w-full relative overflow-hidden h-[3px]"
                    style={{ backgroundColor: config.progressTrackBg }}
                >
                    <div
                        style={{
                            height: "100%",
                            backgroundColor: config.progressFill,
                            animationName: "toastProgressShrink",
                            animationDuration: `${duration}ms`,
                            animationTimingFunction: "linear",
                            animationFillMode: "forwards",
                            animationPlayState: isHovered
                                ? "paused"
                                : "running",
                        }}
                    />
                </div>
            )}
        </motion.div>
    );
};

/**
 * ✅ 3. Toast 容器组件
 */
export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <>
            <ProgressKeyframes />
            <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none p-1">
                <AnimatePresence mode="popLayout">
                    {toasts.map((toast) => (
                        <Toast
                            key={toast.id}
                            message={toast.message}
                            type={toast.type}
                            duration={toast.duration}
                            onClose={() => removeToast(toast.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </>
    );
};

/**
 * ✅ 4. Context & Provider 模块封装
 */
const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const lastToastTimeRef = useRef(0);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type, duration = 5000) => {
        const now = Date.now();
        const gapTime = 1500;

        if (now - lastToastTimeRef.current < gapTime) {
            return;
        }

        lastToastTimeRef.current = now;

        // 优先使用 Web API 生成标准 UUID
        const id =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${now}-${Math.random().toString(36).substring(2, 9)}`;

        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    // 使用 useMemo 记忆 context 对象，防止不必要的子组件重渲染
    const contextValue = useMemo(
        () => ({ showToast, removeToast }),
        [showToast, removeToast],
    );

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

export default ToastProvider;
