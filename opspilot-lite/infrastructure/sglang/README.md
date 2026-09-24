# Separate MiMo inference

Deploy SGLang on a private GPU host. Run `serve-pip.sh` after installing SGLang or
`serve-docker.sh` with `HF_TOKEN` set. These examples expose port 30000 locally;
use a private network between the Go API and inference host in production.
The simple launch command is useful for connectivity checks. The model card's
multi-node SGLang recipe may be needed for practical full-model serving.
Never add this service to the normal application Compose stack.

