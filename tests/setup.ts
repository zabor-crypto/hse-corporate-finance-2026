// Legacy fixture adapter: original banks and registry references remain observable in old tests.
import pack from "../src/runtime/t3-pack";
import {topics,lessons,formulas,problems,seminarMap,sampleExamIds} from "../src/content";
import {curriculumRegistry} from "../src/curriculum";
import {registerPack,activateModule} from "../src/runtime/store";
registerPack({...pack,content:{topics,lessons,formulas,problems,seminarMap,sampleExamIds},registry:curriculumRegistry});
activateModule("T3");
