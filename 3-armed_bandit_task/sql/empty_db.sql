

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";




-- --------------------------------------------------------

--
-- Table structure for table `experiment_data`
--

CREATE TABLE IF NOT EXISTS `sophie_3opt_experiment_data` (
`EXPID` varchar(20) NOT NULL,
`ID` varchar(100) NOT NULL,
`EXP` varchar(20) NOT NULL,
`BROW` text NOT NULL,
`DBTIME` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `learning_data`
--

CREATE TABLE IF NOT EXISTS `sophie_3opt_learning_data` (
`EXP` varchar(20) NOT NULL,
`EXPID` varchar(20) NOT NULL,
`ID` varchar(100) NOT NULL,
`TEST` int(11) NOT NULL,
`TRIAL` int(11) NOT NULL,
`COND` int(11) NOT NULL,
`SYML` varchar(20) NOT NULL,
`SYMM` varchar(20) NOT NULL,
`SYMR` varchar(20) NOT NULL,
`CLMR` tinyint(4) NOT NULL,
`CGB` tinyint(4) NOT NULL,
`RGB` varchar(20) NOT NULL,
`CFGB1` varchar(20) NOT NULL,
`CFGB2` varchar(20) NOT NULL,
`RTIME` bigint(20) NOT NULL,
`REW` double NOT NULL,
`SESSION` int(11) NOT NULL,
`P1` varchar(20) NOT NULL,
`P2` varchar(20) NOT NULL,
`P3` varchar(20) NOT NULL,
`MEAN1` varchar(20) NOT NULL,
`MEAN2` varchar(20) NOT NULL,
`MEAN3` varchar(20) NOT NULL,
`VAR1` varchar(20) NOT NULL,
`VAR2` varchar(20) NOT NULL,
`VAR3` varchar(20) NOT NULL,
`VAL1` varchar(20) NOT NULL,
`VAL2` varchar(20) NOT NULL,
`VAL3` varchar(20) NOT NULL,
`INF1` varchar(20) NOT NULL,
`INF2` varchar(20) NOT NULL,
`INF3` varchar(20) NOT NULL,
`OP1` varchar(20) NOT NULL,
`OP2` varchar(20) NOT NULL,
`OP3` varchar(20) NOT NULL,
`V1` varchar(20) NOT NULL,
`V2` varchar(20) NOT NULL,
`V3` varchar(20) NOT NULL,
`CTIME` bigint(20) NOT NULL,
`DBTIME` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------
--
-- Table structure for table `explicit_data`
--

CREATE TABLE IF NOT EXISTS `sophie_3opt_explicit_data` (
`EXP` varchar(20) NOT NULL,
`EXPID` varchar(20) NOT NULL,
`ID` varchar(100) NOT NULL,
`TEST` int(11) NOT NULL,
`TRIAL` int(11) NOT NULL,
`OPT` int(11) NOT NULL,
`ANSWER` varchar(20) NOT NULL,
`VALUE` varchar(20) NOT NULL,
`REWARD` double NOT NULL,
`SUMREWARD` double NOT NULL,
`SYM` varchar(20) NOT NULL,
`RTIME` bigint(20) NOT NULL,
`CTIME` bigint(20) NOT NULL,
`DBTIME` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------