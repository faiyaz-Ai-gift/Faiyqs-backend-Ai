Render Environment Variables:
AI_API_URL=your OpenAI-compatible chat completions endpoint
AI_API_KEY=your API key
AI_MODEL=your chat model
IMAGE_API_URL=your image generations endpoint
IMAGE_API_KEY=your image API key
IMAGE_MODEL=your image model

The frontend sends attached files as multipart/form-data to /api/chat. Text/CSV/JSON files are included in AI context. Other files are uploaded and identified to the model.
