import gulp from 'gulp';
import sloc from 'gulp-sloc2';
import eslint from 'gulp-eslint';
import imagemin from 'gulp-imagemin';
import pngquant from 'imagemin-pngquant';

const lintConfig = { configFile: 'eslint.json' };

// 代码检查任务
const check = () => {
    const src = ['Gulpfile.js', 'star.js', 'lib/**/*.js'];
    return gulp.src(src)
        .pipe(eslint(lintConfig))
        .pipe(eslint.format('stylish'));
};

// 代码统计任务
const codeStats = () => {
    const src = ['Gulpfile.js', 'star.js', 'lib/**/*.js'];
    return gulp.src(src).pipe(sloc());
};

// 图片优化任务
const optimizeImages = () => {
    const imgPath = ['snapshot/*'];
    return gulp.src(imgPath)
        .pipe(imagemin({
            progressive: true,
            use: [pngquant()],
        }))
        .pipe(gulp.dest('snapshot/'));
};

// 组合任务
const runAll = gulp.parallel(check, optimizeImages, codeStats);

// 默认任务
const defaultTask = async () => {
    await runAll();
    console.log(`\n---------> All tasks completed! Executed: ${runAll._tasks.join(', ')}\n`);
};

// 导出任务
export {
    check,
    codeStats as sloc,
    optimizeImages as opt,
    defaultTask as default
};