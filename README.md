# 日程管理网页应用

这个网页应用允许用户通过简单的聊天界面和可视化日历来管理他们的日程安排。它集成了AI助手功能，能够智能解析用户的自然语言输入。

## 功能特点

- 交互式日历，支持日、周、月视图
- 两栏布局：日历显示和聊天输入
- AI驱动的自然语言处理，支持多种格式的日程输入
- 智能解析输入的日期、时间、时长、重复频率和备注信息
- 支持相对日期输入（如"今天"、"明天"、"下周一"）和绝对日期输入
- 在日历和聊天界面中显示添加的任务
- 通过点击日历中的任务可以查看详细信息，包括备注和原始输入
- 自定义模态弹窗用于任务确认、详情展示和用户输入
- 时间冲突检测功能
- 预设输入样式模板，方便用户快速输入
- 支持重复事件（每天、每周、每月、每年）
- "添加课程表"功能按钮，位于日历视图右上方

## 最近更新 (v4.5.0)

- 增加了"添加课程表"功能按钮，为未来课程表功能做准备
- 优化了事件详情显示，现在可以查看和隐藏原始输入文本
- 改进了用户界面，添加了新的样式来美化原始输入的显示
- 更新了AI助手的提示，以提取更详细的任务信息
- 优化了日历视图的布局，为新添加的按钮腾出空间

## 下一步计划

- 实现"添加课程表"功能，允许用户输入和管理课程安排
- 实现更复杂的重复规则，如"每两周"、"每个工作日"等
- 增强聊天界面，添加AI驱动的建议和提醒功能
- 添加任务编辑和删除功能
- 实现数据持久化，支持用户账户系统
- 添加更多自定义选项，如事件颜色和提醒设置
- 优化移动端体验
- 添加多语言支持
- 实现任务优先级和分类功能

## 如何使用

1. 克隆或下载此仓库到本地
2. 确保您已经配置了正确的AI服务凭证（在 `aiAssistant.js` 中）
3. 在浏览器中打开 `index.html` 文件
4. 在聊天框中输入自然语言描述（如"每周一下午3点开会，时长2小时，备注：准备项目报告"）来添加任务
5. AI助手将解析您的输入并提取相关信息，包括重复频率和备注
6. 在弹出的确认对话框中确认任务详情，包括备注信息
7. 确认添加任务后，查看日历中自动更新的任务安排
8. 点击日历中的事件可以查看详细信息，包括原始输入文本

## 注意事项

- 请确保您的网络连接正常，以便成功连接到AI服务
- 如果遇到连接问题，请检查浏览器控制台输出以获取更多信息
- 本项目使用了基本的加密方法来保护API凭证，但这并不能完全保证安全性。在生产环境中使用时，请考虑更安全的凭证管理方式。

## 技术栈

- HTML5
- CSS3
- JavaScript (ES6+)
- FullCalendar.js 库（包括RRule插件用于重复事件）
- 讯飞开放平台 AI 服务

## 安全性说明

为了保护API凭证，本项目使用了基本的Base64编码。这种方法并不能提供真正的安全性，仅用于防止casual观察。在实际部署时，请考虑使用更安全的方法来管理您的API凭证，如使用环境变量或后端服务。

## 贡献

欢迎贡献代码或提出建议，以帮助改进这个日程管理应用！如果您发现任何问题或有改进意见，请创建一个issue或提交一个pull request。

## 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。
