import {mountCourseAccess} from './progress/courseAccess';
const dispose=mountCourseAccess('lesson-3-prologue',()=>import('./bootstrap'));
if(import.meta.hot)import.meta.hot.dispose(dispose);
