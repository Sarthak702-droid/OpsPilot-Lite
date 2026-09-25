package purchaseorders

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"
)

var ErrMailUnavailable = errors.New("supplier email is not configured")

type Mailer interface {
	Send(context.Context, string, string, string) error
}
type SMTPMailer struct{ Host, Port, User, Password, From string }

func (m SMTPMailer) Configured() bool { return m.Host != "" && m.Port != "" && m.From != "" }

func (m SMTPMailer) Send(ctx context.Context, to, subject, body string) error {
	if !m.Configured() {
		return ErrMailUnavailable
	}
	if strings.ContainsAny(to, "\r\n") || strings.ContainsAny(subject, "\r\n") || strings.ContainsAny(m.From, "\r\n") {
		return errors.New("invalid email address or subject")
	}
	address := net.JoinHostPort(m.Host, m.Port)
	conn, err := (&net.Dialer{Timeout: 10 * time.Second}).DialContext(ctx, "tcp", address)
	if err != nil {
		return err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(20 * time.Second))
	client, err := smtp.NewClient(conn, m.Host)
	if err != nil {
		return err
	}
	defer client.Close()
	if ok, _ := client.Extension("STARTTLS"); !ok {
		return errors.New("SMTP server does not support STARTTLS")
	}
	if err = client.StartTLS(&tls.Config{ServerName: m.Host, MinVersion: tls.VersionTLS12}); err != nil {
		return err
	}
	if m.User != "" {
		if err = client.Auth(smtp.PlainAuth("", m.User, m.Password, m.Host)); err != nil {
			return err
		}
	}
	if err = client.Mail(m.From); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	message := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s\r\n", m.From, to, subject, body)
	if _, err = w.Write([]byte(message)); err != nil {
		_ = w.Close()
		return err
	}
	if err = w.Close(); err != nil {
		return err
	}
	return client.Quit()
}
