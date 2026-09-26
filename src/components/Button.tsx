import type { ButtonHTMLAttributes } from "react";

// ui_guide 버튼: primary · secondary · text + 삭제 확인용 danger (on-color는 필요할 때 추가)
const VARIANT = {
  primary: "bg-primary text-on-primary",
  secondary: "border border-hairline bg-canvas text-ink",
  text: "text-ink",
  danger: "bg-error text-on-primary",
} as const;
const SIZE = { md: "h-11 px-5", sm: "h-9 px-3" } as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
};

export default function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-button disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    />
  );
}
