import { usePublicConfig } from "./usePublicConfig";
import { useEffect } from "react";

export const useThemeColors = () => {
    const publicConfig = usePublicConfig();

    useEffect(() => {
        if (publicConfig.primary_color) {
            const color = publicConfig.primary_color;
            document.documentElement.style.setProperty("--primary-gradient", `linear-gradient(135deg, ${color}, ${color})`);
        }
        if (publicConfig.secondary_color) {
            const color = publicConfig.secondary_color;
            document.documentElement.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${color}, ${color})`);
        }
        if (publicConfig.background_color) {
            const color = publicConfig.background_color;
            // We can use a subtle gradient derivative or just solid.
            // Let's try to make a very subtle gradient from it to keep the "premium" feel.
            document.body.style.background = `linear-gradient(135deg, ${color} 0%, ${color} 100%)`;
        }
    }, [publicConfig.primary_color, publicConfig.secondary_color, publicConfig.background_color]);
};
