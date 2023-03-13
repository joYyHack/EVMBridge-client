import React from "react";

interface ButtonProps {
  type?: string;
  children?: string;
  disabled?: boolean;
  className?: string;
  onClick: any;
  loading?: boolean;
  loadingText?: string;
}

const Button = ({
  type = "primary",
  children,
  disabled = false,
  className = "",
  onClick,
  loading = false,
  loadingText,
}: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-sm btn-${type} ${className} `}
    >
      {loading ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-3"
            role="status"
            aria-hidden="true"
          ></span>{" "}
          {loadingText ? <span>{loadingText}</span> : <span>Loading...</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
