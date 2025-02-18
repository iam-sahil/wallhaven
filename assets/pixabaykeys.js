
export const apiKeys = [
    '48675339-6352adfe70c38b559cc47db45',
    '48683714-78f0b85840a2bf6890b36e22e',
    '48684097-0413150f8456623116aaa3201',
    '48684125-6a2326aa2d5bc136491b61639',
    '48684156-ab5cc7073181359eb82768af3'
  ];
let currentKeyIndex = 0;
export function getNextApiKey() {
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}
