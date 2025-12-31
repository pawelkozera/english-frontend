type LessonProgressSummaryProps = {
  loading: boolean;
  doneCount?: number;
  totalCount?: number;
};

export default function LessonProgressSummary({
  loading,
  doneCount = 0,
  totalCount = 0,
}: LessonProgressSummaryProps) {
  if (loading) {
    return <span>Loading...</span>;
  }

  const isCompleted = totalCount > 0 && doneCount >= totalCount;
  return (
    <span className={isCompleted ? "font-semibold text-emerald-600" : ""}>
      {totalCount ? `${doneCount}/${totalCount}` : "0/0"}
      {isCompleted ? " Completed" : ""}
    </span>
  );
}
