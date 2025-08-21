import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RegnrInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export default function RegnrInput({
  value,
  onChange,
  onEnter,
  error,
  disabled,
  className
}: RegnrInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.toUpperCase();
    
    // Remove any non-alphanumeric characters except space
    input = input.replace(/[^A-ZÆØÅ0-9\s]/gi, '');
    
    // Format as AA 12345
    if (input.length > 2 && !input.includes(' ')) {
      input = input.slice(0, 2) + ' ' + input.slice(2);
    }
    
    // Limit to 8 characters (AA 12345)
    if (input.length > 8) {
      input = input.slice(0, 8);
    }
    
    setLocalValue(input);
    onChange(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  return (
    <div className="flex-1">
      <Input
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="AA 12345"
        disabled={disabled}
        className={cn(
          "font-mono uppercase",
          error && "border-destructive",
          className
        )}
        maxLength={8}
      />
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}