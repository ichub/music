ID=4ebKhEZNI5rZB989ilgjCg
CLIENT_ID=f52483b4b5cc4e2cb0b750eda8d62672
CLIENT_SECRET=02c7400a729842e0ab6a8a9cd6bc9a19
curl -X "POST" -H "Authorization: Basic $(echo -n $CLIENT_ID:$CLIENT_SECRET | base64)" -d grant_type=client_credentials https://accounts.spotify.com/api/token > token
curl -X GET "https://api.spotify.com/v1/audio-analysis/${ID}" -H "Authorization: Bearer $(cat token | jq -r '.access_token')" > analysis.json

# $(cat token | jq -r '.access_token')
cat analysis.json