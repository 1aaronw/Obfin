use axum::{routing::post, Json, Router};
use serde_json::json;
use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;

#[derive(Deserialize)]
struct ChatRequest {
        user_question: String,

        // payload along with question
        total_food: f64,
        total_rent: f64,
        total_entertainment: f64,

        /*
                TODO
                upon finishing the news portion, whenever a user asks a question, also throw in top financial news as additional context
        */
        // news_context: String,
}

#[derive(Serialize)]
struct ChatResponse {
        chat_response: String,
}

#[tokio::main]
async fn main() {
        let app = Router::new().route("/chatbot", post(handler));
        let listener = TcpListener::bind("0.0.0.0:8081").await.unwrap();

        axum::serve(listener, app).await.unwrap();
}

async fn handler(Json(chat_request): Json<ChatRequest>) -> Json<ChatResponse> {
        let api_key = std::env::var("OPENAI_KEY").expect("OPENAI_KEY not set"); // expects host environment variable with key set, try echo var
        let client = reqwest::Client::new();

        let system_prompt = format!(
                "You are a personal finance assistant. You have access to the user's spending data: Food: ${:.2}, Rent: ${:.2}, Entertainment: ${:.2}. Use this information to provide personalized advice when relevant. Be conversational and helpful.",

                // format to ${} above string
                chat_request.total_food, chat_request.total_rent, chat_request.total_entertainment
        );

        let body = json!({
                "model": "gpt-4o-mini",
                "messages": [
                {"role": "system", "content": system_prompt}, // what is llm chat model acting as with given information
                {"role": "user", "content": chat_request.user_question} // user's actual input question
                ],

                "max_tokens": 500, // calculate the cost per request later assuming WORST CASE set by max_tokens
                "temperature": 0.7, // randomness [0.0 - 1.0], ex: 1.0 for storytelling maximum randomness, 0.0 for factual answers (deterministic)
        });




        // error handling what the fuck am i doing
        let chat_response = match client
                .post("https://api.openai.com/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&body)
                .send()
                .await
        {
                Ok(r) => r,
                Err(e) => {
                        eprintln!("Request failed: {}", e);

                        return Json(ChatResponse {
                                chat_response: format!("Request error: {}", e)
                        });
                }
        };

        // check status code
        if !chat_response.status().is_success() {
                let status = chat_response.status();
                let error_text = chat_response.text().await.unwrap_or_default();

                eprintln!("API error {}: {}", status, error_text);

                return Json(ChatResponse {
                        chat_response: format!("API error {}: {}", status, error_text)
                });
        }

        let json_resp = match chat_response.json::<serde_json::Value>().await {
                Ok(j) => j,
                Err(e) => {
                        eprintln!("JSON parse error: {}", e);

                        return Json(ChatResponse {
                                chat_response: format!("Parse error: {}", e)
                        });
                }
        };

        // print full response
        eprintln!("API Response: {}", serde_json::to_string_pretty(&json_resp).unwrap());

        let answer = json_resp["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or("Could not extract answer from response")
                .to_string();

        Json(ChatResponse { chat_response: answer })
}