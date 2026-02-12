// prototype-pollution.js
// Vulnerable examples
const obj1 = {};
obj1["__proto__"] = { polluted: true }; // Match 1

const obj2 = {};
obj2["constructor"] = { polluted: true }; // Match 2

const obj3 = {};
obj3["prototype"] = { polluted: true }; // Match 3

// Secure examples
const safeObj = Object.create(null);
safeObj["__proto__"] = { polluted: false }; // This still matches the pattern but is technically "safe" in some contexts, 
                                            // however the pattern is looking for the assignment itself.
