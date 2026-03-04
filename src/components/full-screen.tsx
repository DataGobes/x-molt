import React from "react";
import { Box } from "ink";
import { Header } from "./header.js";
import { KeyHints } from "./footer.js";
import { useTerminalSize } from "../hooks/use-terminal-size.js";
import { BRAND_COLOR } from "../utils/constants.js";

interface FullScreenProps {
  children: React.ReactNode;
  title?: string;
  hints?: string[];
  showBack?: boolean;
}

export function FullScreen({ children, title, hints = [], showBack = false }: FullScreenProps) {
  const { width, height } = useTerminalSize();
  const cardWidth = Math.min(70, width - 6);
  // Inner width accounts for border (1 char each side) + padding (2 chars each side)
  const innerWidth = cardWidth - 6;

  return (
    <Box
      width={width}
      height={height}
      alignItems="center"
      justifyContent="center"
    >
      <Box
        flexDirection="column"
        width={cardWidth}
        borderStyle="round"
        borderColor={BRAND_COLOR}
        paddingX={2}
        paddingY={1}
      >
        {title && <Header title={title} width={innerWidth} />}
        {children}
        <KeyHints hints={hints} showBack={showBack} width={innerWidth} />
      </Box>
    </Box>
  );
}
