build:
	sudo docker build -t runready-backend .

run:
	sudo docker rm -f runready-api 2>/dev/null || true
	sudo docker run -d \
		-p 8000:8000 \
		--name runready-api \
		--env-file .env \
		runready-backend

deploy: build run

logs:
	sudo docker logs -f runready-api

stop:
	sudo docker stop runready-api && sudo docker rm runready-api
