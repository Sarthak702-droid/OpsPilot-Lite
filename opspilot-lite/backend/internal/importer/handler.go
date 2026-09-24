package importer

import (
	"encoding/csv"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"github.com/xuri/excelize/v2"
	"io"
	"net/http"
	"strings"
)

type Handler struct{ Service Service }

func (h Handler) Preview(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil || file.Size == 0 || file.Size > 10<<20 {
		common.Error(c, 422, "VALIDATION_ERROR", "Upload a CSV or XLSX file up to 10 MB")
		return
	}
	f, err := file.Open()
	if err != nil {
		common.Error(c, 400, "BAD_FILE", "Cannot open upload")
		return
	}
	defer f.Close()
	name := strings.ToLower(file.Filename)
	var rows [][]string
	if strings.HasSuffix(name, ".xlsx") {
		book, openErr := excelize.OpenReader(io.LimitReader(f, 10<<20), excelize.Options{UnzipSizeLimit: 20 << 20, UnzipXMLSizeLimit: 10 << 20})
		if openErr != nil {
			common.Error(c, 422, "BAD_FILE", "Invalid XLSX workbook")
			return
		}
		defer book.Close()
		sheets := book.GetSheetList()
		if len(sheets) == 0 {
			common.Error(c, 422, "BAD_FILE", "XLSX has no worksheets")
			return
		}
		rows, err = book.GetRows(sheets[0])
	} else if strings.HasSuffix(name, ".csv") {
		reader := csv.NewReader(io.LimitReader(f, 10<<20))
		reader.FieldsPerRecord = -1
		for len(rows) < 4 {
			row, readErr := reader.Read()
			if readErr == io.EOF {
				break
			}
			if readErr != nil {
				err = readErr
				break
			}
			rows = append(rows, row)
		}
	} else {
		common.Error(c, 422, "BAD_FILE", "Only CSV and XLSX are supported")
		return
	}
	if err != nil || len(rows) == 0 {
		common.Error(c, 422, "BAD_FILE", "Could not read headers")
		return
	}
	sample := rows[1:]
	if len(sample) > 3 {
		sample = sample[:3]
	}
	c.JSON(200, gin.H{"headers": rows[0], "sample": sample})
}

func (h Handler) Import(c *gin.Context) {
	id, _ := auth.Current(c)
	file, err := c.FormFile("file")
	if err != nil || file.Size > 10<<20 || file.Size == 0 {
		common.Error(c, 422, "VALIDATION_ERROR", "Upload a CSV or XLSX file up to 10 MB")
		return
	}
	name := strings.ToLower(file.Filename)
	if !strings.HasSuffix(name, ".csv") && !strings.HasSuffix(name, ".xlsx") {
		common.Error(c, 422, "VALIDATION_ERROR", "Only CSV and XLSX are supported by this endpoint")
		return
	}
	f, err := file.Open()
	if err != nil {
		common.Error(c, 400, "BAD_FILE", "Cannot open upload")
		return
	}
	defer f.Close()
	var mapping map[string]string
	if raw := c.PostForm("mapping"); raw != "" {
		if json.Unmarshal([]byte(raw), &mapping) != nil {
			common.Error(c, 422, "VALIDATION_ERROR", "Invalid column mapping")
			return
		}
	}
	var result Result
	if strings.HasSuffix(name, ".xlsx") {
		result, err = h.Service.ImportXLSX(c.Request.Context(), id.OrganizationID, c.PostForm("type"), f, mapping)
	} else {
		result, err = h.Service.ImportCSV(c.Request.Context(), id.OrganizationID, c.PostForm("type"), f, mapping)
	}
	if err != nil {
		common.Error(c, http.StatusUnprocessableEntity, "IMPORT_ERROR", err.Error())
		return
	}
	c.JSON(201, result)
}
