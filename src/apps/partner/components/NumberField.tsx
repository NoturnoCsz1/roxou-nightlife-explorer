/**
 * NumberField — input numérico tolerante.
 *
 * Mantém o valor digitado como string para permitir apagar, colar e ficar
 * temporariamente vazio. Emite o número apenas no `onBlur` (ou ao montar
 * com valor inicial). Quando vazio, emite `fallback` (default 0) ou `null`
 * se `nullable`.
 */
import { Input } from "@/components/ui/input";
import { forwardRef, useEffect, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

type BaseProps = Omit<
  ComponentPropsWithoutRef<typeof Input>,
  "value" | "onChange" | "type" | "onBlur"
>;

interface NumberFieldProps extends BaseProps {
  value: number | null | undefined;
  onChange: (v: number) => void;
  fallback?: number;
  allowDecimal?: boolean;
}

interface NullableNumberFieldProps extends BaseProps {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  nullable: true;
  allowDecimal?: boolean;
}

export const NumberField = forwardRef<
  HTMLInputElement,
  NumberFieldProps | NullableNumberFieldProps
>(function NumberField(props, ref) {
  const {
    value,
    onChange,
    allowDecimal,
    inputMode,
    ...rest
  } = props as NumberFieldProps & { nullable?: boolean };
  const nullable = (props as NullableNumberFieldProps).nullable === true;
  const fallback = (props as NumberFieldProps).fallback ?? 0;

  const [text, setText] = useState<string>(
    value === null || value === undefined ? "" : String(value),
  );

  // Sync external changes (e.g. when initial loads async).
  useEffect(() => {
    setText(value === null || value === undefined ? "" : String(value));
  }, [value]);

  return (
    <Input
      ref={ref}
      type="text"
      inputMode={inputMode ?? (allowDecimal ? "decimal" : "numeric")}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        // permite apenas dígitos / ponto / vírgula / vazio
        if (v === "" || /^[0-9]*[.,]?[0-9]*$/.test(v)) {
          setText(v);
        }
      }}
      onBlur={() => {
        const normalized = text.replace(",", ".").trim();
        if (normalized === "") {
          if (nullable) {
            (onChange as (v: number | null) => void)(null);
          } else {
            (onChange as (v: number) => void)(fallback);
            setText(String(fallback));
          }
          return;
        }
        const n = Number(normalized);
        if (Number.isNaN(n)) {
          if (nullable) {
            (onChange as (v: number | null) => void)(null);
            setText("");
          } else {
            (onChange as (v: number) => void)(fallback);
            setText(String(fallback));
          }
          return;
        }
        (onChange as (v: number) => void)(n);
        // re-normaliza visualmente
        setText(String(n));
      }}
      {...rest}
    />
  );
});

export default NumberField;
