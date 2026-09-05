/**
 * Calculates a deterministic priority score for a topic based on:
 * - Urgency (proximity to exam date)
 * - Difficulty (1 to 5)
 * - Confidence gap (6 - confidence level)
 * - Subject priority weight (1 to 5)
 */
const calculateTopicPriority = (topic, subject, targetDate = new Date()) => {
  const examDate = new Date(subject.examDate);
  const now = new Date(targetDate);
  
  // Calculate days remaining until exam
  const diffTime = examDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Urgency: higher when fewer days remain. Clamped to at least 1 day to prevent division by zero
  const daysUntilExam = Math.max(1, diffDays);
  // Normalize urgency: 1 / daysUntilExam. For scale, multiply by 10 or normalize across 0-5
  // If exam is tomorrow, 1/1 * 10 = 10. If exam is in 10 days, 1/10 * 10 = 1.
  const urgencyScore = Math.min(10, (10 / daysUntilExam));

  const difficultyScore = Number(topic.difficulty) || 3; // 1 to 5
  const confidenceGapScore = 6 - (Number(topic.confidenceLevel) || 3); // 1 to 5 (Mastered=1, Low=5)
  const subjectWeight = Number(subject.priorityWeight) || 3; // 1 to 5

  // Tuned weights:
  // Urgency: 40%, Confidence Gap: 25%, Difficulty: 20%, Subject Weight: 15%
  const priorityScore =
    (urgencyScore * 0.40) +
    (confidenceGapScore * 0.25) +
    (difficultyScore * 0.20) +
    (subjectWeight * 0.15);

  return {
    priorityScore: parseFloat(priorityScore.toFixed(3)),
    daysUntilExam,
    urgencyScore: parseFloat(urgencyScore.toFixed(2)),
  };
};

module.exports = { calculateTopicPriority };
