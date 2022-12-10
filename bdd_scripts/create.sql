CREATE TABLE g_usr (
    g_ur_id BIGINT,
    g_ur_name VARCHAR(50),
    g_ur_img VARCHAR(500),
    g_ur_ttv_tok VARCHAR(500),
    g_ur_shr INT,
    g_ur_key VARCHAR(5000),
    PRIMARY KEY(g_ur_id)
);

CREATE TABLE g_ban (
    g_bn_id VARCHAR(50),
    g_bn_ban VARCHAR(50),
    PRIMARY KEY(g_bn_id, g_bn_ban)
);

CREATE TABLE g_sub (
    g_sb_id VARCHAR(50),
    g_sb_sub VARCHAR(50),
    PRIMARY KEY(g_sb_id, g_sb_sub)
);

CREATE TABLE tokens (
    userId BIGINT,
    accessToken VARCHAR(50),
    refreshToken VARCHAR(100),
    expiresIn BIGINT,
    obtainmentTimestamp BIGINT,
    PRIMARY KEY(userId)
);

CREATE OR REPLACE VIEW v_all_usr AS 
SELECT g_ur_id, g_ur_name, g_ur_img, SUM(subs) subs, SUM(bans) bans FROM (
	SELECT u.g_ur_id, u.g_ur_name, u.g_ur_img, 0 subs, count(b.g_bn_ban) bans
	FROM g_usr u, g_ban b
	WHERE b.g_bn_id = u.g_ur_id
	AND u.g_ur_shr = 1
	GROUP BY u.g_ur_id
	UNION ALL
	SELECT ur.g_ur_id, ur.g_ur_name, ur.g_ur_img, count(s.g_sb_sub) subs, 0 bans
	FROM g_usr ur, g_sub s
	WHERE s.g_sb_id = ur.g_ur_id
	AND ur.g_ur_shr = 1
	GROUP BY ur.g_ur_id
) tmp
GROUP BY g_ur_id, g_ur_name, g_ur_img;