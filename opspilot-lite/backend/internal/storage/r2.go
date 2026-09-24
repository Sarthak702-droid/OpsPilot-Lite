package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type R2 struct {
	Client *s3.Client
	Bucket string
}

func NewR2(ctx context.Context, accountID, accessKey, secretKey, bucket, endpoint string) (*R2, error) {
	if accountID == "" || accessKey == "" || secretKey == "" || bucket == "" {
		return nil, errors.New("R2 is not configured")
	}
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
	}
	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion("auto"), awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")))
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(cfg, func(o *s3.Options) { o.BaseEndpoint = aws.String(endpoint); o.UsePathStyle = true })
	return &R2{Client: client, Bucket: bucket}, nil
}
func (r *R2) Put(ctx context.Context, key, contentType string, body []byte) error {
	_, err := r.Client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(r.Bucket), Key: aws.String(key), Body: bytes.NewReader(body), ContentType: aws.String(contentType)})
	return err
}
func (r *R2) Delete(ctx context.Context, key string) error {
	_, err := r.Client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(r.Bucket), Key: aws.String(key)})
	return err
}
