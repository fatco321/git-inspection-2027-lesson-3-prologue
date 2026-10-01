export const workshopFurniture = [
 {file:'workbench-vice',x:-2.3,z:-5.64,height:1.12},
 {file:'tool-pegboard',x:-2.3,z:-6.17,height:1.9,widthScale:1.12},
 {file:'parts-shelving',x:.95,z:-6.15,height:2.053},
] as const;
export const machines = [
 {id:'m204',title:'ПР-204',file:'bench-lathe',x:-4.58,z:-2.15,height:1.49,labelY:.69},
 {id:'m208',title:'ПР-208',file:'pillar-drill',x:-4.59,z:-4.25,height:2.16,labelY:1.77},
] as const;
export const documentTable = { x: -1.7, z: .16, width: 2.5, depth: 1.42, interactionZ: 1.4 };
export const tabletRest = { x: documentTable.x - .7, y: 1.043, z: documentTable.z + .39 };
export const tabletPickup = { x: tabletRest.x, z: tabletRest.z + .57 };
