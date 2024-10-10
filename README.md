# 日程管理网页应用

这个网页应用允许用户通过简单的聊天界面和可视化日历来管理他们的日程安排。

## 功能特点

- 交互式日历，支持日、周、月视图
- 两栏布局：日历显示和聊天输入
- 支持多种格式的日程输入，包括自然语言和结构化输入
- 智能解析输入的日期、时间和时长信息
- 在日历和聊天界面中显示添加的任务
- 通过点击日历中的任务可以查看详细信息
- 自定义模态弹窗用于任务确认和详情展示
- 预设输入样式模板，方便用户快速输入

## 最近更新

- 改进了日程输入解析功能，支持更多自然语言输入格式
- 增强了日期和时间的解析能力
- 添加了更多输入样例，帮助用户理解可接受的输入格式
- 优化了UI样式，更接近苹果日历的设计风格
- 改进了事件在日历中的显示效果
- 添加了查看事件详情的功能
- 实现了自定义模态弹窗，替代了浏览器默认弹窗
- 美化了弹窗样式，提升了用户体验

## 下一步计划

- 实现重叠任务的冲突检测
- 增强聊天界面，添加AI驱动的建议和提醒功能
- 添加任务编辑功能
- 实现数据持久化，支持用户账户系统
- 添加更多自定义选项，如事件颜色和提醒设置

## 如何使用

1. 打开index.html文件在浏览器中查看应用
2. 使用日历界面直接点击添加、查看或删除事件
3. 在聊天框中输入自然语言描述（如"明天下午3点开会，时长2小时"）来添加任务
4. 使用预设输入样式模板快速填充常用任务格式
5. 在弹出的确认对话框中确认任务详情
6. 确认添加任务后，查看日历中自动更新的任务安排

## 技术栈

- HTML5
- CSS3
- JavaScript
- FullCalendar.js库

## 新增特性

- 自定义模态弹窗：替代了浏览器默认的alert()、confirm()和prompt()弹窗
- 改进的UI/UX：弹窗设计更加美观，与整体页面风格统一
- 动画效果：添加了弹窗的淡入和缩放动画，提升用户体验
- 响应式设计：弹窗布局适应不同屏幕尺寸

欢迎贡献代码或提出建议，以帮助改进这个日程管理应用！