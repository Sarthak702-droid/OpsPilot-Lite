package importer

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
)

type DocumentHandler struct{ Service DocumentService }

func documentUpload(c *gin.Context) ([]byte, string, bool) {
	file, err := c.FormFile("file")
	if err != nil || file.Size < 5 || file.Size > 10<<20 || !strings.HasSuffix(strings.ToLower(file.Filename), ".pdf") {
		common.Error(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Upload a PDF up to 10 MB")
		return nil, "", false
	}
	f, err := file.Open()
	if err != nil {
		common.Error(c, http.StatusBadRequest, "BAD_FILE", "Cannot open upload")
		return nil, "", false
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, (10<<20)+1))
	if err != nil || len(data) > 10<<20 {
		common.Error(c, http.StatusUnprocessableEntity, "BAD_FILE", "PDF exceeds 10 MB")
		return nil, "", false
	}
	return data, file.Filename, true
}

func (h DocumentHandler) Preview(c *gin.Context) {
	data, _, ok := documentUpload(c)
	if !ok {
		return
	}
	preview, err := h.Service.Preview(c.Request.Context(), data)
	if err != nil {
		common.Error(c, http.StatusUnprocessableEntity, "BAD_PDF", err.Error())
		return
	}
	c.JSON(http.StatusOK, preview)
}

func (h DocumentHandler) Commit(c *gin.Context) {
	identity, _ := auth.Current(c)
	data, name, ok := documentUpload(c)
	if !ok {
		return
	}
	var review DocumentReview
	if err := json.Unmarshal([]byte(c.PostForm("review")), &review); err != nil {
		common.Error(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Invalid review JSON")
		return
	}
	if err := review.Validate(); err != nil {
		common.Error(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", err.Error())
		return
	}
	if h.Service.Store == nil {
		common.Error(c, http.StatusServiceUnavailable, "STORAGE_UNAVAILABLE", "R2 storage is not configured")
		return
	}
	id, err := h.Service.Commit(c.Request.Context(), identity.OrganizationID, identity.UserID, c.ClientIP(), name, data, review)
	if err != nil {
		if errors.Is(err, ErrDocumentStorage) {
			common.Error(c, http.StatusBadGateway, "STORAGE_ERROR", "Document storage failed")
			return
		}
		common.Error(c, http.StatusUnprocessableEntity, "DOCUMENT_IMPORT_ERROR", "Could not save reviewed document; check counterparty and document number")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "status": "REVIEWED"})
}
