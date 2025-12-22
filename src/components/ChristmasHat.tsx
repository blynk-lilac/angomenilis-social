export const ChristmasHat = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="20"
    viewBox="0 0 24 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Hat base (red triangle) */}
    <path
      d="M12 0L24 18H0L12 0Z"
      fill="#DC2626"
    />
    {/* White fur trim at bottom */}
    <ellipse cx="12" cy="18" rx="12" ry="2.5" fill="white" />
    {/* Pom pom at top */}
    <circle cx="12" cy="1" r="2" fill="white" />
    {/* Highlight on hat */}
    <path
      d="M12 2L16 12H8L12 2Z"
      fill="#EF4444"
      opacity="0.5"
    />
  </svg>
);

export default ChristmasHat;
