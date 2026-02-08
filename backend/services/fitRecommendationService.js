// AI Fit Recommendation Mock Service
export const recommendFit = (userSizeProfile, productDimensions) => {
  if (!userSizeProfile || !productDimensions) {
    return {
      fitPercentage: 0,
      message: 'Insufficient data for fit recommendation'
    };
  }

  const { shoulder: userShoulder, chest: userChest, length: userLength } = userSizeProfile;
  const { shoulder: productShoulder, chest: productChest, length: productLength } = productDimensions;

  if (!userShoulder || !userChest || !userLength || 
      !productShoulder || !productChest || !productLength) {
    return {
      fitPercentage: 0,
      message: 'Missing dimension data'
    };
  }

  // Calculate fit scores for each dimension (within 5% is perfect, 10% is good, 20% is acceptable)
  const calculateFitScore = (userDim, productDim) => {
    const diff = Math.abs(userDim - productDim);
    const percentageDiff = (diff / userDim) * 100;

    if (percentageDiff <= 2) return 100;
    if (percentageDiff <= 5) return 95;
    if (percentageDiff <= 10) return 85;
    if (percentageDiff <= 15) return 70;
    if (percentageDiff <= 20) return 60;
    if (percentageDiff <= 25) return 45;
    return 30;
  };

  const shoulderScore = calculateFitScore(userShoulder, productShoulder);
  const chestScore = calculateFitScore(userChest, productChest);
  const lengthScore = calculateFitScore(userLength, productLength);

  // Weighted average (chest is most important, then shoulder, then length)
  const fitPercentage = Math.round(
    (chestScore * 0.5) + (shoulderScore * 0.3) + (lengthScore * 0.2)
  );

  // Generate fit message
  let message;
  if (fitPercentage >= 90) {
    message = 'Perfect Fit';
  } else if (fitPercentage >= 75) {
    message = 'Great Fit';
  } else if (fitPercentage >= 60) {
    message = 'Good Fit';
  } else if (fitPercentage >= 45) {
    message = 'Moderate Fit';
  } else {
    message = 'Poor Fit';
  }

  return {
    fitPercentage,
    message: `${fitPercentage}% ${message}`,
    breakdown: {
      shoulder: shoulderScore,
      chest: chestScore,
      length: lengthScore
    }
  };
};

