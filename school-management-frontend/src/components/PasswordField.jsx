import React, { useId, useState } from "react";

function EyeIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      {!open ? (
        <path
          d="M4 4 20 20"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      ) : null}
    </svg>
  );
}

export default function PasswordField({ className = "", id, ...props }) {
  const generatedId = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className={`password-field ${className}`.trim()}>
      <input
        {...props}
        id={id || generatedId}
        type={visible ? "text" : "password"}
        className="password-field-input"
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        <EyeIcon open={visible} />
      </button>
    </div>
  );
}
