const Department = require('../models/Department');

const categoryToDepartment = {
  pothole: 'Public Works',
  streetlight: 'Electrical',
  trash: 'Sanitation',
  graffiti: 'Parks & Buildings',
  water_leak: 'Waterworks',
  tree_hazard: 'Parks',
  sidewalk: 'Public Works',
  traffic_signal: 'Traffic',
  noise: 'Public Safety',
  parking: 'Traffic',
  animal_control: 'Animal Control',
  public_safety: 'Police',
  other: 'General Maintenance'
};

const routeReportToDepartment = async (category) => {
  const deptName = categoryToDepartment[category] || 'General Maintenance';
  let dept = await Department.findOne({ name: deptName });
  if (!dept) {
    dept = await Department.create({ name: deptName });
  }
  return dept;
};

module.exports = { routeReportToDepartment };
